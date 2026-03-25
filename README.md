# PDF Editor — IRCTC Editor (React UI)

This repo currently focuses on a single working UI: `IRCTCEditor`.

- The **UI** runs via Vite in development.
- The Express server (`server.js`) serves the built `dist/` and also provides authenticated `/api/*` endpoints.

The older template-based API code (`/api/pdf`, `/api/template`, field configs, and pdf generator) has been archived.

The older static UI that lived in `public/` has been archived to `archive/2026-03-24-reorg/backend/public`.

---

## Features

- Edit IRCTC ticket fields
- Live PDF preview (PDF.js)
- Download generated PDF
- Login-only access (users managed in Neon)
- Optional encrypted API payloads (IV + salt)

---

## Quick Start

### Install dependencies
```bash
npm install
```

### Development (recommended)

Runs the Express server (+ Vite dev server) together:

```bash
npm run dev
```

Open the UI at `http://localhost:5173`.

Note: the current `IRCTCEditor` UI generates PDFs fully client-side, so it can work even if the backend isn’t running.

### Production-style (single port)

Build the frontend and serve it from the server on port 3000:

```bash
npm run build
npm start
```

---

## Database (Neon) setup

The app expects Neon Postgres for stations, routes, trains, and login users.

1) Run schema:
- Run [db/schema.sql](db/schema.sql) in Neon SQL editor.

2) Run seed (optional, for initial station/train data):
- Run [db/seed.sql](db/seed.sql) in Neon SQL editor.

3) Create a login user:
```sql
INSERT INTO auth_users (email, password_hash)
VALUES ('you@example.com', crypt('YourPassword', gen_salt('bf')));
```

---

## Deploy on Render

This repo includes a Render blueprint: [render.yaml](render.yaml)

1) Create a new Render **Web Service** from this repo (or use the blueprint).
2) Build command: `npm install && npm run build`
3) Start command: `npm start`
4) Set environment variables in Render:
- `DATABASE_URL` (your Neon connection string)
- `AUTH_JWT_SECRET` (long random string)
- `PUBLIC_ORIGIN` (your Render URL, e.g. `https://your-app.onrender.com`)
- `REQUIRE_ENCRYPTED_PAYLOADS=1` (default)

Notes:
- Render provides `PORT` automatically; do not hardcode it.
- `NODE_ENV=production` is set in the blueprint.

---

## Project Structure

```
pdf-editor/
├── server.js                     # Express API + (optional) static UI
├── src/                          # React UI source
├── index.html
├── vite.config.mjs
└── archive/                      # Archived/unused files
```

## PDF Coordinate System

`pdf-lib` uses a **bottom-left origin** (0,0 is bottom-left of page).
- US Letter page: 612 × 792 points
- Landscape Letter: 792 × 612 points
- 1 point = 1/72 inch

To find coordinates: use Adobe Acrobat's cursor coordinates or a tool like [PDF Debugger](https://pdf.js.org/web/viewer.html).

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | (none) | Neon connection string |
| `AUTH_JWT_SECRET` | (dev-only fallback) | JWT signing secret (required in production) |
| `PUBLIC_ORIGIN` | (none) | Allowed browser origin in production |
| `REQUIRE_ENCRYPTED_PAYLOADS` | `1` | Require encrypted payloads for auth/core APIs |
| `REQUIRE_POP_SIGNATURES` | `0` | If `1`, require proof-of-possession signatures for core `/api/*` calls |
| `POP_NONCE_TTL_MS` | `60000` | PoP nonce lifetime in milliseconds (single-use) |
| `API_RATE_WINDOW_MS` | `60000` | API rate-limit window (ms) |
| `API_RATE_LIMIT` | `120` | Max requests per IP per API window |
| `AUTH_RATE_WINDOW_MS` | `900000` | Auth rate-limit window (ms) |
| `AUTH_RATE_LIMIT` | `20` | Max login/logout requests per IP per auth window |
| `JSON_BODY_LIMIT` | `1mb` | Max JSON request body size |
| `PORT` | `3000` | HTTP port (Render injects this in production) |

---

## License

MIT
