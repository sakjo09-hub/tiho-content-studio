/* eslint-disable @typescript-eslint/no-require-imports */
const https = require("node:https");
const crypto = require("node:crypto");
const fs = require("node:fs");

const ca = fs.readFileSync(__dirname + "/russian-root-ca.crt");
const agent = new https.Agent({ ca, rejectUnauthorized: true });

function request(url, { method = "GET", headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method, headers, agent }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve({
        status: res.statusCode || 500,
        body: Buffer.concat(chunks).toString("utf8"),
      }));
    });
    req.setTimeout(45_000, () => req.destroy(new Error("Upstream timeout")));
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function json(statusCode, value) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
    body: JSON.stringify(value),
  };
}

function authorized(event) {
  const expected = Buffer.from(process.env.GIGACHAT_CREDENTIALS || "");
  const actual = Buffer.from(
    event.headers?.["x-relay-key"] ||
    event.headers?.["X-Relay-Key"] ||
    "",
  );
  return expected.length > 20 && expected.length === actual.length &&
    crypto.timingSafeEqual(expected, actual);
}

async function token() {
  const credentials = (process.env.GIGACHAT_CREDENTIALS || "").replace(/^Basic\s+/i, "");
  const body = `scope=${encodeURIComponent(process.env.GIGACHAT_SCOPE || "GIGACHAT_API_PERS")}`;
  const response = await request("https://ngw.devices.sberbank.ru:9443/api/v2/oauth", {
    method: "POST",
    headers: {
      authorization: `Basic ${credentials}`,
      rquid: crypto.randomUUID(),
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
      "content-length": Buffer.byteLength(body),
    },
    body,
  });
  if (response.status !== 200) throw new Error(`oauth:${response.status}`);
  const value = JSON.parse(response.body).access_token;
  if (!value) throw new Error("oauth:no-token");
  return value;
}

async function uploadPhoto(accessToken, photo) {
  const match = String(photo?.dataUrl || "").match(/^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > 4 * 1024 * 1024) throw new Error("photo:too-large");
  const boundary = `----tiho-${crypto.randomBytes(12).toString("hex")}`;
  const name = String(photo.name || "story-photo.jpg").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const prefix = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${name}"\r\nContent-Type: ${match[1]}\r\n\r\n`,
  );
  const suffix = Buffer.from(
    `\r\n--${boundary}\r\nContent-Disposition: form-data; name="purpose"\r\n\r\ngeneral\r\n--${boundary}--\r\n`,
  );
  const body = Buffer.concat([prefix, bytes, suffix]);
  const response = await request("https://api.giga.chat/v1/files", {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": `multipart/form-data; boundary=${boundary}`,
      "content-length": body.length,
    },
    body,
  });
  if (response.status < 200 || response.status >= 300) throw new Error(`upload:${response.status}`);
  return JSON.parse(response.body).id || null;
}

async function removePhoto(accessToken, fileId) {
  if (!fileId) return;
  await request(`https://api.giga.chat/v1/files/${encodeURIComponent(fileId)}/delete`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}` },
  });
}

exports.handler = async (event) => {
  const method = event.httpMethod || event.requestContext?.http?.method;
  if (method !== "POST") return json(405, { error: "Method not allowed" });
  if (!authorized(event)) return json(401, { error: "Unauthorized" });
  let input;
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64").toString("utf8")
      : event.body || "{}";
    if (Buffer.byteLength(raw) > 8 * 1024 * 1024) return json(413, { error: "Payload too large" });
    input = JSON.parse(raw);
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  let accessToken;
  let fileIds = [];
  try {
    accessToken = await token();
    const photos = Array.isArray(input.photos) ? input.photos.slice(0, 4) : [];
    for (const photo of photos) {
      const fileId = await uploadPhoto(accessToken, photo);
      if (fileId) fileIds.push(fileId);
    }
    const prompt = String(input.prompt || "").slice(0, 5000);
    if (!prompt) return json(400, { error: "Prompt required" });
    const payload = JSON.stringify({
      model: "GigaChat-2-Pro",
      messages: [{ role: "user", content: prompt, ...(fileIds.length ? { attachments: fileIds } : {}) }],
      stream: false,
      temperature: 0.7,
    });
    const response = await request("https://api.giga.chat/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: "application/json",
        "content-type": "application/json",
        "content-length": Buffer.byteLength(payload),
      },
      body: payload,
    });
    if (response.status !== 200) throw new Error(`generation:${response.status}`);
    const content = JSON.parse(response.body).choices?.[0]?.message?.content;
    if (!content) throw new Error("generation:no-content");
    return json(200, { content });
  } catch (error) {
    console.error("GigaChat relay error", String(error?.message || error));
    return json(502, { error: "AI service unavailable" });
  } finally {
    if (accessToken && fileIds.length) {
      for (const fileId of fileIds) {
        try { await removePhoto(accessToken, fileId); } catch {}
      }
    }
  }
};
