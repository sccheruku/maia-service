# maia-service

How a human of a given rating would move: [Maia](https://www.maiachess.com/) (University of Toronto,
CSSLab) behind a small HTTP API, for [HoneyChess](https://honeychess.com). Private; called by
HoneyChess's API only.

Plan: HoneyChess `todos/todo-111.md` (sccheruku/chess-metrics).

## The contract (planned)

```
POST /predict
{ "fen": "<FEN>", "rating": 1200 }            // or "band": "1100-1200"
→ { "moves": [ { "uci": "e2e4", "san": "e4", "p": 0.41 }, ... ] }   // most likely first
```

Batched (several positions a call), cached by (FEN, rating band).

## First steps

1. **Licences:** Maia's code and model weights (Maia and Maia-2). If GPL, this repository is GPL too,
   kept apart from HoneyChess's code; a network service doesn't require publishing the source (AGPL
   would).
2. **Which model:** Maia-2 (one model, rating as an input) or the original Maia (one model per rating
   band); sizes; CPU time per position.
3. **The wrapper:** a small Python HTTP server; a container on AWS (Lambda container or a small
   service) behind HoneyChess's API; a cost estimate.

Nothing from Maia is in this repository yet: the licences come first.
