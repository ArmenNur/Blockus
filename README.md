# 🌱 Bloomgrid

A corner-to-corner garden tile game for 2–4 players. Play locally against bots or hot-seat, or open an online room and share a link — no database, no accounts.

## Rules in 20 seconds

- Everyone has the same 18-piece seed packet (74 squares).
- Your first piece covers your glowing **seedbed** in your corner.
- Every later piece must touch one of **your** pieces **corner-to-corner** and never share a flat edge with your own pieces. Touching other colors is fine.
- Score: **1 per square**, **+10** for planting every piece. Board: 14×14 (2p), 17×17 (3p), 20×20 (4p).

Controls: click a piece → click the board. `R`/right-click rotate, `Q` rotate back, `F` flip, `Esc` cancel, `H` hint, `Ctrl+Z` undo (local). Touch: tap to preview, tap again (or **Plant here**) to confirm.

## Develop

```bash
npm install
npm run dev        # Vite client on :5173 + game server on :4320 (proxied)
npm test           # engine + bot tests (vitest)
npm run typecheck
```

## Production

```bash
npm run build      # typecheck → client to dist/ → server bundle to dist-server/
npm start          # serves the client and Socket.io on $PORT (default 4320)
```

## Deploy free on Render

1. Push this folder to a GitHub repo.
2. On render.com → **New → Blueprint**, pick the repo (it reads `render.yaml`), or **New → Web Service** with
   - Build: `npm ci --include=dev && npm run build`
   - Start: `npm start`
   - Health check: `/health`
3. Open the URL. Free instances sleep when idle; the first visit takes ~30–60 s to wake up, and open rooms are lost on restart (they live in memory).

## Layout

```
src/game/      pure rules engine (pieces, engine, ai) — shared by client and server
src/components board, tray, panels, results, how-to-play, game view
src/screens/   home, local setup, online lobby
src/hooks/     useLocalGame (reducer + bots + undo), useOnline (socket.io)
server/        express + socket.io rooms, server-authoritative moves, bots, reconnect
tests/         engine/bot tests
```

Online rooms are server-authoritative: every move is re-validated with the same engine. Refreshing the tab rejoins your seat (60 s grace); the host can replace an absent player with a bot.
