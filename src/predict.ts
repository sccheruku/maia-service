/**
 * The prediction: positions and ratings in, each legal move's probability (and the side to move's
 * loss/draw/win chances) out, from Maia-3 via maia3-web. Shared by the Lambda handler and the local
 * server. Knows nothing about who asks: no users, no games, only positions.
 */
import { Chess } from "chess.js";
import { Maia3, analyse, parseWeights } from "maia3-web";

export const MAX_POSITIONS = 16;
/** Maia-3 learned from lichess games; ratings far outside this are poorly covered (maia3-web's README). */
export const MIN_ELO = 400, MAX_ELO = 3000;

export interface PositionRequest {
  /** The position to predict from (FEN). */
  fen: string;
  /** Earlier positions of the game, oldest first (FENs); the model reads the last eight. Optional. */
  history?: string[];
  /** The rating of the player to move, and of their opponent (defaults to the same). */
  elo: number;
  oppElo?: number;
}
export interface MoveOut { uci: string; san: string; p: number }
export interface PositionResult { moves: MoveOut[]; value: { loss: number; draw: number; win: number } }

export class BadRequest extends Error {}

/** Loads a model's weights (an int8 file from maia3-web's format). */
export function loadNet(bytes: Uint8Array): Maia3 {
  return new Maia3(parseWeights(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer));
}

function checkElo(v: unknown, name: string): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < MIN_ELO || v > MAX_ELO) throw new BadRequest(`${name}: a rating from ${MIN_ELO} to ${MAX_ELO}`);
  return Math.round(v);
}

/** One position: its legal moves (from chess.js), each with Maia's probability, most likely first. */
export function predictOne(net: Maia3, r: PositionRequest): PositionResult {
  if (!r || typeof r.fen !== "string") throw new BadRequest("fen: required");
  let board: Chess;
  try { board = new Chess(r.fen); } catch (e) { throw new BadRequest(`fen: ${(e as Error).message}`); }
  const history = Array.isArray(r.history) ? r.history.slice(-7) : [];
  for (const f of history) { try { new Chess(f); } catch { throw new BadRequest("history: each entry a FEN"); } }
  const elo = checkElo(r.elo, "elo"), oppElo = r.oppElo === undefined ? elo : checkElo(r.oppElo, "oppElo");
  const legal = board.moves({ verbose: true });
  if (!legal.length) return { moves: [], value: { loss: 0, draw: 0, win: 0 } };
  const sanOf = new Map(legal.map((m) => [m.from + m.to + (m.promotion ?? ""), m.san]));
  const { moves, value } = analyse(net, [...history, r.fen], [...sanOf.keys()], elo, oppElo);
  const round = (x: number) => Math.round(x * 10000) / 10000;
  return {
    moves: moves.map((m: { move: string; p: number }) => ({ uci: m.move, san: sanOf.get(m.move) ?? m.move, p: round(m.p) })),
    value: { loss: round(value[0]), draw: round(value[1]), win: round(value[2]) },
  };
}

/** A request body: one position, or { positions: [...] } (up to MAX_POSITIONS). */
export function predict(net: Maia3, body: unknown): { results: PositionResult[] } {
  const b = body as { positions?: unknown } | null;
  const list = b && Array.isArray(b.positions) ? b.positions : b ? [b] : [];
  if (!list.length) throw new BadRequest("a position ({ fen, elo }) or { positions: [...] }");
  if (list.length > MAX_POSITIONS) throw new BadRequest(`at most ${MAX_POSITIONS} positions a request`);
  return { results: list.map((p) => predictOne(net, p as PositionRequest)) };
}
