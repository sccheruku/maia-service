/** Time per position for each model on this machine:  npm run bench */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { loadNet, predictOne } from "../src/predict.js";
const require = createRequire(import.meta.url);
const models = JSON.parse(readFileSync("models.json", "utf8")) as Record<string, { weights: string }>;
const fen = "r1bqkbnr/pppp1ppp/8/8/3QP3/8/PPP2PPP/RNB1KB1R b KQkq - 0 5";
for (const [name, m] of Object.entries(models)) {
  let t = performance.now(); const net = loadNet(readFileSync(require.resolve(`maia3-web/weights/${m.weights}`)));
  const load = performance.now() - t; t = performance.now();
  for (let i = 0; i < 10; i++) predictOne(net, { fen, elo: 1200 });
  console.log(`${name}: load ${load.toFixed(0)} ms, ${((performance.now() - t) / 10).toFixed(0)} ms a position`);
}
