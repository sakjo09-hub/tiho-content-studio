/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  GIGACHAT_CREDENTIALS?: string;
  GIGACHAT_SCOPE?: string;
  GIGACHAT_RELAY_URL?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

type PhotoInput = { dataUrl?: string; name?: string };

type StoryRequest = {
  format?: "stories";
  tone?: "warm" | "expert" | "sales";
  goal?: "trust" | "booking" | "education";
  idea?: string;
  photos?: PhotoInput[];
};

type StoryPlan = {
  headline: string;
  body: string;
  caption: string;
  layout: "editorial" | "stickers" | "infographic" | "before-after";
  palette: "sand" | "sage" | "charcoal" | "rose";
  photoRole: "background" | "hero" | "split" | "none";
};

const recentRequests = new Map<string, number[]>();

function demoPlan(input: StoryRequest): StoryPlan {
  const topic = input.idea?.trim().slice(0, 180) || "Время позаботиться о себе";
  const educational = input.goal === "education";
  return {
    headline: educational ? topic : "Красивые изменения начинаются с заботы о себе",
    body: educational
      ? "Коротко и понятно — без мифов и громких обещаний."
      : "Не за один день. Бережно, постепенно и с вниманием к вашему телу.",
    caption: `${topic}\n\nКаждый результат индивидуален. Перед процедурой мы обсуждаем самочувствие и выбираем комфортный формат работы.`,
    layout: educational ? "infographic" : input.photos?.length ? "editorial" : "stickers",
    palette: educational ? "charcoal" : "sand",
    photoRole: input.photos?.length ? (input.photos.length > 1 ? "split" : "hero") : "none",
  };
}

function cleanPlan(value: unknown, fallback: StoryPlan): StoryPlan {
  if (!value || typeof value !== "object") return fallback;
  const item = value as Record<string, unknown>;
  const text = (key: string, max: number, defaultValue: string) =>
    typeof item[key] === "string" ? item[key].trim().slice(0, max) || defaultValue : defaultValue;
  const oneOf = <T extends string>(key: string, values: readonly T[], defaultValue: T) =>
    typeof item[key] === "string" && values.includes(item[key] as T) ? item[key] as T : defaultValue;
  return {
    headline: text("headline", 110, fallback.headline),
    body: text("body", 240, fallback.body),
    caption: text("caption", 1200, fallback.caption),
    layout: oneOf("layout", ["editorial", "stickers", "infographic", "before-after"] as const, fallback.layout),
    palette: oneOf("palette", ["sand", "sage", "charcoal", "rose"] as const, fallback.palette),
    photoRole: oneOf("photoRole", ["background", "hero", "split", "none"] as const, fallback.photoRole),
  };
}

async function getGigaToken(env: Env) {
  const response = await fetch("https://ngw.devices.sberbank.ru:9443/api/v2/oauth", {
    method: "POST",
    headers: {
      Authorization: `Basic ${env.GIGACHAT_CREDENTIALS}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      RqUID: crypto.randomUUID(),
    },
    body: new URLSearchParams({ scope: env.GIGACHAT_SCOPE || "GIGACHAT_API_PERS" }),
  });
  if (!response.ok) throw new Error(`GigaChat auth failed: ${response.status}`);
  const data = await response.json() as { access_token?: string };
  if (!data.access_token) throw new Error("GigaChat token missing");
  return data.access_token;
}

async function uploadPhoto(token: string, photo: PhotoInput) {
  const match = photo.dataUrl?.match(/^data:(image\/(?:png|jpeg));base64,(.+)$/);
  if (!match) return null;
  const bytes = Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0));
  if (bytes.byteLength > 4 * 1024 * 1024) throw new Error("Photo payload too large");
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: match[1] }), (photo.name || "story-photo.jpg").slice(0, 80));
  form.append("purpose", "general");
  const response = await fetch("https://api.giga.chat/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!response.ok) throw new Error(`GigaChat upload failed: ${response.status}`);
  const data = await response.json() as { id?: string };
  return data.id || null;
}

async function generateStory(request: Request, env: Env, ctx: ExecutionContext) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (origin && origin !== url.origin) return new Response("Forbidden", { status: 403 });
  if (Number(request.headers.get("Content-Length") || 0) > 8 * 1024 * 1024) {
    return Response.json({ error: "Фотография слишком большая" }, { status: 413 });
  }

  const client = request.headers.get("CF-Connecting-IP") || "local";
  const now = Date.now();
  const history = (recentRequests.get(client) || []).filter((time) => now - time < 60_000);
  if (history.length >= 8) return Response.json({ error: "Слишком много запросов. Попробуйте через минуту." }, { status: 429 });
  recentRequests.set(client, [...history, now]);

  let input: StoryRequest;
  try {
    input = await request.json() as StoryRequest;
  } catch {
    return Response.json({ error: "Некорректный запрос" }, { status: 400 });
  }
  input.idea = typeof input.idea === "string" ? input.idea.trim().slice(0, 240) : "";
  input.format = "stories";
  input.photos = Array.isArray(input.photos) ? input.photos.slice(0, 4) : [];
  const fallback = demoPlan(input);
  if (!env.GIGACHAT_CREDENTIALS) {
    return Response.json({ plan: fallback, mode: "demo" });
  }

  const prompt = `Создай целостную концепцию сторис для частного массажиста.
Тема: ${input.idea || "забота о себе"}. Тон: ${input.tone || "warm"}. Цель: ${input.goal || "booking"}.
Приложено фото: ${input.photos.length}. Если фото есть, проанализируй их вместе и предложи единую композицию; для нескольких фото используй цельный коллаж или сравнение, а не отдельные несвязанные публикации. Не ставь диагнозы, не обещай лечение, похудение, вывод токсинов или гарантированный результат.
Стиль: живой русский язык, короткий сильный заголовок, максимум 2 коротких предложения на изображении, спокойная эстетика малого бизнеса.
Верни ТОЛЬКО JSON:
{"headline":"...","body":"...","caption":"...","layout":"editorial|stickers|infographic|before-after","palette":"sand|sage|charcoal|rose","photoRole":"background|hero|split|none"}`;

  if (env.GIGACHAT_RELAY_URL) {
    try {
      const response = await fetch(env.GIGACHAT_RELAY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Relay-Key": env.GIGACHAT_CREDENTIALS,
        },
        body: JSON.stringify({ prompt, photos: input.photos }),
      });
      if (!response.ok) throw new Error(`GigaChat relay failed: ${response.status}`);
      const data = await response.json() as { content?: string };
      const raw = data.content?.replace(/^```json\s*|\s*```$/g, "") || "";
      const plan = cleanPlan(JSON.parse(raw), fallback);
      return Response.json({ plan, mode: "ai" });
    } catch {
      return Response.json({ plan: fallback, mode: "fallback" });
    }
  }

  let cleanupToken: string | null = null;
  let cleanupFileIds: string[] = [];
  try {
    const token = await getGigaToken(env);
    cleanupToken = token;
    const fileIds = (await Promise.all((input.photos || []).map((photo) => uploadPhoto(token, photo))))
      .filter((fileId): fileId is string => Boolean(fileId));
    cleanupFileIds = fileIds;
    const response = await fetch("https://api.giga.chat/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: "GigaChat-2-Pro",
        messages: [{ role: "user", content: prompt, ...(fileIds.length ? { attachments: fileIds } : {}) }],
        stream: false,
        temperature: 0.7,
      }),
    });
    if (!response.ok) throw new Error(`GigaChat generation failed: ${response.status}`);
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content?.replace(/^```json\s*|\s*```$/g, "") || "";
    const plan = cleanPlan(JSON.parse(raw), fallback);
    return Response.json({ plan, mode: "ai" });
  } catch {
    return Response.json({ plan: fallback, mode: "fallback" });
  } finally {
    if (cleanupToken && cleanupFileIds.length) {
      ctx.waitUntil(Promise.all(cleanupFileIds.map((fileId) => fetch(`https://api.giga.chat/v1/files/${fileId}/delete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${cleanupToken}` },
      }).then(() => undefined).catch(() => undefined))));
    }
  }
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/generate-story") {
      return generateStory(request, env, ctx);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
