# 📚 StudyBuddy (PWA hackathon)

An AI assistant that organises your school material — and grew into a personal hub with study, work, food, journal, health and games areas. **React + Vite** frontend, backend on a **Cloudflare Worker** with **KV** storage, AI with **Groq** and login with **Google**. Installable as a PWA.

## 📁 Project Structure

```
worker/                  ← BACKEND (Cloudflare Worker)
  index.js                 Router: /api/... → routes/
  routes/
    google.js, me.js, logout.js   Auth: verify Google ID token, who am I, sign out
    entries.js                    GET/POST/PATCH/DELETE the user's tasks (KV)
    transcribe.js                 Audio → text (Groq Whisper)
    command.js                    Text → proposed actions (Groq)
    organize.js                   Organise a subject's documents with AI
    board.js, files.js            Area boards and uploaded files
    projects.js, tasknotes.js     Shared work projects; notes → task list (AI)
    recipes.js, ingredients.js    Recipes from a PDF or photo; missing-ingredient suggestions (AI)
    friends.js, social.js, shares.js  Friends, social feed and sharing
    games.js, define.js           Daily word games (bee, crossword) and short word definitions
    profile.js                    Avatar and settings
server/                  ← Backend code that is NOT an endpoint
  google.js                Google ID token verification
  session.js               Signed session cookie (JWT)
  groq.js                  Groq API client
  http.js                  Response helpers
  entries.js, boards.js, … Data access per feature (KV)
src/                     ← FRONTEND
  screens/                 Login, desktop (DesktopApp) and mobile (MobileApp) views, calendar, profile, friends…
  pages/                   Food, Work and Study pages
  widgets/                 Area widgets (study, work, food, journal, health, games) + grids and popups
  components/, hooks/, services/, i18n/, onboarding/, data/areas.js (shared with the backend)
wrangler.jsonc           Worker config: static assets + KV binding (DATA)
deploy.secrets.env       Maps build variables to Worker secrets on deploy (contains no secrets itself)
```

## 🚀 How It Works

1. You sign in with Google; the Worker verifies the ID token and sets a signed session cookie
2. You talk or type: audio is transcribed with **Whisper**, then **Groq** turns the text into proposed actions (tasks, events…) that you confirm
3. Everything is stored per user in **Cloudflare KV**
4. Other AI helpers organise uploaded documents by subject, turn project notes into tasks, read recipes from PDFs or photos and suggest ingredients

### One Worker serves everything

The Vite build is served as static assets by the same Worker that answers `/api/*`, so frontend and API share one origin and the session cookie just works.

### Separation of concerns

`worker/routes/` only parses requests and returns responses; the real logic lives in `server/`, so it can be reused and tested without HTTP.

## 🧠 Key Concepts

- **Cloudflare Workers + KV** — serverless API and key-value storage
- **Google Identity** — ID token verification on the server
- **Sessions with signed JWT cookies** (`jose`)
- **LLM features** — speech-to-text, natural language → actions, document organisation
- **Responsive app** — separate desktop and mobile layouts
- **i18n** — Spanish / English
- **PWA** — installable, works like a native app

## 🛠️ How To Run

1. **Google Client ID** — in [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Configure the *OAuth consent screen* (External, Testing mode, add your emails as test users)
   - *Create credentials → OAuth client ID → Web application*
   - **Authorized JavaScript origins**: `http://localhost:5173`, `http://localhost` and `https://prueba-1.lagoanadia.workers.dev` (no trailing slash)
2. **Groq API key** — <https://console.groq.com/keys>
3. Copy `.env.example` → `.env.local` (frontend) and `.dev.vars.example` → `.dev.vars` (backend) and fill them in
4. Start it in **two terminals**:

```bash
npm install
npm run dev:api
```

```bash
npm run dev
```

Open <http://localhost:5173>. Vite forwards `/api` to the Worker (port 8787). If you change anything in `worker/` or `server/`, restart `dev:api`.

### Deploy on Cloudflare Workers

Live at <https://prueba-1.lagoanadia.workers.dev> · config in `wrangler.jsonc`.

1. Cloudflare → *Workers & Pages* → `prueba-1` → *Settings → Build*: build command `npm run build`, deploy command `npx wrangler deploy`, branch `main`
2. **Build variables** (*Settings → Build → Variables and secrets*): `VITE_GOOGLE_CLIENT_ID` — embedded in the frontend at build time
3. **Runtime variables** (*Settings → Variables and Secrets*): `GOOGLE_CLIENT_ID`, `SESSION_SECRET` (secret), `GROQ_API_KEY` (secret), optional `GROQ_MODEL`
4. After changing build variables, redeploy
5. Add `https://prueba-1.lagoanadia.workers.dev` to Google's *Authorized JavaScript origins*
