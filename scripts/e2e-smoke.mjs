const worker = (await import("../.output/server/index.mjs")).default;
const context = { waitUntil() {}, passThroughOnException() {} };
const runtimeEnv = { ...process.env };

const home = await worker.fetch(new Request("http://resolveiq.local/"), runtimeEnv, context);
const html = await home.text();
if (!home.ok || !html.includes("ResolveIQ") || !html.includes('lang="tr"')) {
  throw new Error(`Landing page smoke check failed with HTTP ${home.status}`);
}

const webhook = await worker.fetch(
  new Request("http://resolveiq.local/api/webhooks/incidents", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  }),
  runtimeEnv,
  context,
);
if (webhook.status !== 401) throw new Error(`Webhook auth check returned ${webhook.status}`);

console.log("Built-worker HTTP smoke checks passed (landing page + webhook auth boundary).");
