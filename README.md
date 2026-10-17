# QuizRush

QuizRush is a browser-based multiplayer party quiz game. Players create or join
private rooms with a six-character code, receive questions from the checked-in
local question bank, answer against a server-owned deadline, and see a shared
leaderboard.

The backend keeps active rooms in memory for this MVP. Restarting the server
clears rooms and active matches.

## Requirements

- Node.js `22.14.0` (pinned in `.nvmrc`)
- npm

## Install

```bash
npm ci --prefix server
npm ci --prefix client
```

## Run locally

Start the authoritative game server in one terminal:

```bash
npm run dev --prefix server
```

The server listens on `http://localhost:3001` by default and exposes
`GET /health`.

Start the Vite client in another terminal:

```bash
npm run dev --prefix client
```

Open the Vite URL, normally <http://localhost:5173>. To use another server
address, copy `client/.env.example` to `client/.env` and set `VITE_SERVER_URL`.

## Configuration

Copy `server/.env.example` to `server/.env` when running through a process
manager. The server reads:

- `PORT` — HTTP and Socket.IO port, default `3001`
- `CLIENT_ORIGIN` — one origin or a comma-separated allowlist, default
  `http://localhost:5173`
- `ROOM_EXPIRY_MS` — idle room expiry, default one hour
- `DISCONNECT_GRACE_MS` — reconnect grace period, default 30 seconds
- `CLEANUP_INTERVAL_MS` — cleanup timer interval, default 60 seconds

## Checks

Run backend build and tests:

```bash
npm run check --prefix server
```

Run frontend build and lint:

```bash
npm test --prefix client
```

The backend test suite covers bank validation and filtering, room limits and
isolation, host permissions and transfer, reconnects, Socket.IO events,
question secrecy, synchronized deadlines, answer races, scoring, full-match
completion, rate limiting, cleanup, and server bootstrap.

## Question bank

The authoritative bank is `server/bank/question-bank.json` with this shape:

```json
{
  "questions": [
    {
      "id": "sci-e01",
      "topic": "science",
      "difficulty": "easy",
      "text": "...",
      "options": ["...", "...", "...", "..."],
      "correctIndex": 0
    }
  ]
}
```

The checked-in bank contains 300 valid records across `science`, `history`,
`geography`, `entertainment`, and `sports`, with `easy`, `medium`, and `hard`
difficulties. Existing client `movies` settings map explicitly to the bank's
`entertainment` topic. `mixed` selects from all bank values. The server rejects
requests when fewer eligible questions exist; it never silently falls back to a
different topic or difficulty.

## Socket.IO commands and events

Client commands use acknowledgements with either `{ ok: true, data }` or
`{ ok: false, error }`:

- `room:create`
- `room:join`
- `room:leave`
- `room:ready`
- `room:update-settings`
- `game:start`
- `answer:submit`
- `game:rematch`
- `game:request-state`

Server events include:

- `room:state`, `room:player-joined`, `room:player-left`, `room:host-changed`
- `game:countdown`, `game:question-open`, `game:answer-locked`
- `game:answer-reveal`, `game:leaderboard`, `game:finished`
- `server:error`

Question-open payloads contain only the question ID, wording, options, index,
and server deadline. `correctIndex` is held on the server and appears only in
the answer-reveal event.

## Docker

The existing client image builds the static frontend:

```bash
docker build -t quizrush-client .
docker run --rm -p 8080:80 quizrush-client
```

Build and run the backend separately from the repository root:

```bash
docker build -f server/Dockerfile -t quizrush-server .
docker run --rm -p 3001:3001 -e CLIENT_ORIGIN=http://localhost:8080 quizrush-server
```

Set `VITE_SERVER_URL` to the reachable backend address when building the client
for a non-local deployment.

## Known limitations

- Active rooms and match state are process memory only; there is no database or
  cross-instance synchronization.
- The question bank has no explanation field, so answer reveal returns the
  correct option but no explanation text.
- The client now includes the live room/game path, but server and client still
  need to be deployed as separately reachable processes unless a reverse proxy
  is added.
