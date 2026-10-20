import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";

import { BadRequest, loadNet, predict, predictOne } from "../src/predict.js";

const require = createRequire(import.meta.url);
const net = loadNet(readFileSync(require.resolve("maia3-web/weights/maia3-5m.int8.bin")));
const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

test("the start position: every legal move, probabilities summing to 1, a usual first move on top", () => {
  const r = predictOne(net, { fen: START, elo: 1500 });
  assert.equal(r.moves.length, 20);
  assert.ok(Math.abs(r.moves.reduce((n, m) => n + m.p, 0) - 1) < 0.01);
  assert.ok(["e2e4", "d2d4", "c2c4", "g1f3"].includes(r.moves[0]!.uci), r.moves[0]!.uci);
  assert.equal(r.moves[0]!.san.length > 1, true);
  assert.ok(Math.abs(r.value.loss + r.value.draw + r.value.win - 1) < 0.01);
});

test("the rating changes the prediction", () => {
  const fen = "r1bqkbnr/pppp1ppp/8/8/3QP3/8/PPP2PPP/RNB1KB1R b KQkq - 0 5";
  const low = predictOne(net, { fen, elo: 500 }), high = predictOne(net, { fen, elo: 1800 });
  assert.notDeepEqual(low.moves.slice(0, 3).map((m) => m.uci), high.moves.slice(0, 3).map((m) => m.uci));
});

test("a batch, and bad requests refused", () => {
  assert.equal(predict(net, { positions: [{ fen: START, elo: 1200 }, { fen: START, elo: 2000 }] }).results.length, 2);
  assert.throws(() => predict(net, { fen: "nonsense", elo: 1200 }), BadRequest);
  assert.throws(() => predict(net, { fen: START, elo: 50 }), BadRequest);
  assert.throws(() => predict(net, {}), BadRequest);
  assert.throws(() => predict(net, { positions: Array(17).fill({ fen: START, elo: 1200 }) }), BadRequest);
});

test("checkmate: no moves", () => {
  const mate = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";
  assert.deepEqual(predictOne(net, { fen: mate, elo: 1200 }).moves, []);
});
