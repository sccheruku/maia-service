/** A local server with every model in models.json, for trying the API:  npm run serve  (port 8787). */
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";

import { BadRequest, loadNet, predict } from "./predict.js";

const models = JSON.parse(readFileSync(new URL("../models.json", import.meta.url), "utf8")) as Record<string, { route: string; weights: string }>;
const require = createRequire(import.meta.url);
const nets = new Map(Object.entries(models).map(([name, m]) => [m.route, { name, net: loadNet(readFileSync(require.resolve(`maia3-web/weights/${m.weights}`))) }]));

createServer((req, res) => {
  const send = (code: number, body: unknown) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
  if (req.method === "GET" && req.url === "/health") return send(200, { ok: true, models: Object.keys(models) });
  const m = nets.get(req.url ?? "");
  if (req.method !== "POST" || !m) return send(404, { ok: false, error: `POST ${[...nets.keys()].join(" or ")}` });
  let raw = "";
  req.on("data", (c) => (raw += c)).on("end", () => {
    try { const t = Date.now(); const out = predict(m.net, JSON.parse(raw)); send(200, { ok: true, model: m.name, ms: Date.now() - t, ...out }); }
    catch (e) { send(e instanceof BadRequest ? 400 : e instanceof SyntaxError ? 400 : 500, { ok: false, error: (e as Error).message }); }
  });
}).listen(8787, () => console.log("maia-service on http://localhost:8787:", [...nets.keys()].join(", ")));
