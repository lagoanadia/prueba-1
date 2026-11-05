# StudyBuddy (PWA hackathon)

Asistente con IA que organiza tu material escolar. Frontend en React + Vite, backend en un Cloudflare Worker, IA con Groq y login con Google.

## Estructura

```
worker/                 ← BACKEND (Cloudflare Worker)
  index.js                router: /api/... → routes/
  routes/google.js          POST  verifica el token de Google y crea la sesión
  routes/me.js              GET   ¿quién soy? (401 si no hay sesión)
  routes/logout.js          POST  cierra sesión
  routes/entries.js       GET/POST/PATCH/DELETE  tareas del usuario (Cloudflare KV)
  routes/transcribe.js    POST  audio -> texto (Groq Whisper)
  routes/command.js       POST  texto -> acciones propuestas (Groq)
server/                 ← código del backend que NO es endpoint
  google.js               verificación del ID token de Google
  session.js              cookie de sesión firmada (JWT)
  groq.js                 cliente de la API de Groq
  entries.js              guardar/leer tareas en KV
src/                    ← FRONTEND
  screens/                Login, vista portátil (DesktopApp) y móvil (MobileApp)
  data/areas.js           las 5 áreas (compartido con el backend)
  components/             piezas de UI
  services/               llamadas al backend (auth, IA)
```

## Puesta en marcha (local)

1. **Google Client ID** — [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Configura la *OAuth consent screen* (External, modo Testing, añade vuestros emails como test users).
   - *Create credentials → OAuth client ID → Web application*.
   - **Authorized JavaScript origins**: `http://localhost:5173`, `http://localhost` y `https://prueba-1.lagoanadia.workers.dev`, sin barra final.
2. **Groq API key** — <https://console.groq.com/keys>
3. Copia `.env.example` → `.env.local` (frontend) y `.dev.vars.example` → `.dev.vars` (backend), y rellénalos.
4. Arranca en **dos terminales**:

```bash
npm install
npm run dev:api
```

```bash
npm run dev
```

Abre <http://localhost:5173>. Vite reenvía `/api` al Worker (puerto 8787). Si cambias algo en `worker/` o `server/`, reinicia `dev:api`.

## Despliegue en Cloudflare Workers

URL: <https://prueba-1.lagoanadia.workers.dev> · configuración en `wrangler.jsonc`.

1. Cloudflare → *Workers & Pages* → `prueba-1` → *Settings → Build*: build command `npm run build`, deploy command `npx wrangler deploy`, rama `main`.
2. **Variables de BUILD** (*Settings → Build → Variables and secrets*): `VITE_GOOGLE_CLIENT_ID`. Se incrusta en el frontend al compilar.
3. **Variables de RUNTIME** (*Settings → Variables and Secrets*): `GOOGLE_CLIENT_ID`, `SESSION_SECRET` (Secret), `GROQ_API_KEY` (Secret), opcional `GROQ_MODEL`.
4. Tras cambiar variables de build, vuelve a desplegar.
5. Añade `https://prueba-1.lagoanadia.workers.dev` a los *Authorized JavaScript origins* de Google.
