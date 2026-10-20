# maia-service

How a human of a given rating would move: [Maia-3](https://github.com/CSSLab/maia3) (CSSLab, University
of Toronto) behind a small HTTP API, one AWS Lambda per model, no Docker and no PyTorch: it runs
Maia-3 through [maia3-web](https://github.com/GeoffreyPlitt/maia3-web) (plain TypeScript, int8
weights). Built for [HoneyChess](https://honeychess.com); generic, so anyone can run it.

Licence: AGPL-3.0 (Maia-3's). See NOTICE for credits.

## API

`POST /maia/v3/<size>/predict` (today: `5m`)

```json
{ "fen": "r1bqkbnr/pppp1ppp/8/8/3QP3/8/PPP2PPP/RNB1KB1R b KQkq - 0 5", "elo": 480, "oppElo": 470,
  "history": ["<earlier FENs, oldest first; optional, the model reads the last eight>"] }
```

or `{ "positions": [ ...up to 16 of the above ] }`. Answer:

```json
{ "ok": true, "model": "maia3-5m", "ms": 758,
  "results": [ { "moves": [ { "uci": "g8f6", "san": "Nf6", "p": 0.17 }, ... ],
                 "value": { "loss": 0.53, "draw": 0.10, "win": 0.37 } } ] }
```

Every legal move, most likely first; `value` is for the side to move. Ratings 400-3000 (Maia-3 learned
from lichess games). `GET /health` names the model. No users, no games: only positions.

## Run it

```sh
npm ci
npm test
npm run serve          # http://localhost:8787 with every model in models.json
npm run bench          # time per position on this machine (about 0.8 s for 5M on a laptop CPU)
npm run build          # dist/<model>.zip for AWS Lambda (Node.js 20+, handler index.handler, env MODEL=<model>)
```

## Models

`models.json` lists each model, its route, its weights file and their sha256 (checked at build). The
weights are not in this repository: they come from maia3-web's package. Planned: Maia-3 23M (converted
to int8 with maia3-web's export tool).

## Releases

A tag `v*` builds `dist/<model>.zip` and `SHA256SUMS` in GitHub Actions and attaches them to a GitHub
release. A deployment pins a release and checks the zips against `SHA256SUMS`; no cloud keys live here.
