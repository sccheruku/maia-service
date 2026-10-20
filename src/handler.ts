/**
 * The AWS Lambda for one model (its zip carries that model's weights beside this file; MODEL names it).
 * Routes (an HTTP API or a function URL): POST /maia/v3/<size>/predict, GET /health.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

import { BadRequest, loadNet, predict } from "./predict.js";

const MODEL = process.env.MODEL ?? "maia3-5m";
const here = dirname(fileURLToPath(import.meta.url));
// Loaded once per container (a cold start), not per request.
const net = loadNet(readFileSync(join(here, `${MODEL}.bin`)));

const json = (statusCode: number, body: unknown): APIGatewayProxyResultV2 =>
  ({ statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext?.http?.method ?? "GET", path = event.rawPath ?? "/";
  if (method === "GET" && path.endsWith("/health")) return json(200, { ok: true, model: MODEL });
  if (method !== "POST" || !path.endsWith("/predict")) return json(404, { ok: false, error: "POST /maia/v3/<size>/predict" });
  let body: unknown;
  try { body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body ?? "", "base64").toString("utf8") : event.body ?? ""); }
  catch { return json(400, { ok: false, error: "the body must be JSON" }); }
  try {
    const t = Date.now();
    const out = predict(net, body);
    return json(200, { ok: true, model: MODEL, ms: Date.now() - t, ...out });
  } catch (e) {
    if (e instanceof BadRequest) return json(400, { ok: false, error: e.message });
    console.error(e);
    return json(500, { ok: false, error: "prediction failed" });
  }
}
