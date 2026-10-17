# QuizRush

QuizRush is a playful browser-based party game where friends create or join a room
with a short code and compete in live quiz rounds. The current client keeps rooms
in browser memory so the UI flow can be exercised without a backend.

## Requirements

- Node.js `22.14.0` (the version is pinned in `.nvmrc`)
- npm

## Setup

```bash
npm ci --prefix client
```

## Run locally

```bash
npm run dev --prefix client
```

Open the URL printed by Vite, usually <http://localhost:5173>.

## Test

Run the single project check from the repository root:

```bash
npm test --prefix client
```

This runs the TypeScript/Vite production build followed by ESLint.

## Production build

```bash
npm run build --prefix client
npm run preview --prefix client
```

## Deploy with Docker

```bash
docker build -t quizrush .
docker run --rm -p 8080:80 quizrush
```

Open <http://localhost:8080>.
