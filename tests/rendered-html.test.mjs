import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("https://tiho.example/", {
      headers: {
        accept: "text/html",
        host: "tiho.example",
        "x-forwarded-host": "tiho.example",
        "x-forwarded-proto": "https",
      },
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the complete Russian product page and social metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<html lang="ru">/);
  assert.match(html, /Пост готов/);
  assert.match(html, /Создать публикацию/);
  assert.match(html, /Создать сторис целиком/);
  assert.match(html, /ИИ сможет изменить его под идею/);
  assert.match(html, /Белая плашка/);
  assert.match(html, /Стикеры/);
  assert.match(html, /Фото остаются у вас/);
  assert.match(html, /https:\/\/tiho\.example\/og\.png/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/);
});

test("returns a safe holistic story plan when AI credentials are not configured", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("api-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request("https://tiho.example/api/generate-story", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://tiho.example" },
      body: JSON.stringify({ format: "stories", goal: "education", idea: "Польза воды" }),
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.mode, "demo");
  assert.equal(payload.plan.layout, "infographic");
  assert.match(payload.plan.headline, /Польза воды/);
});
