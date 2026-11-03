# StudyBuddy (PWA hackathon)

Asistente con IA que organiza tu material escolar. Frontend en React + Vite, backend en Cloudflare Pages Functions, IA con Groq y login con Google.

## Estructura

```
functions/api/          ← BACKEND: la ruta del archivo es la URL (Cloudflare Pages Functions)
  auth/google.js          POST  verifica el token de Google y crea la sesión
  auth/me.js              GET   ¿quién soy? (401 si no hay sesión)
  auth/logout.js          POST  cierra sesión
  chat.js                 POST  asistente IA (requiere sesión) -> Groq
server/                 ← código del backend que NO es endpoint
  google.js               verificación del ID token de Google
  session.js              cookie de sesión firmada (JWT)
  groq.js                 cliente de la API de Groq
  prompts.js              system prompt del asistente
src/                    ← FRONTEND
  screens/                Login → Home (subir material) → Assistant (chat)
  components/             piezas de UI
  services/               llamadas al backend (auth, IA)
```

## Puesta en marcha (local)

1. **Google Client ID** — [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Configura la *OAuth consent screen* (External, modo Testing, añade vuestros emails como test users).
   - *Create credentials → OAuth client ID → Web application*.
   - **Authorized JavaScript origins**: `http://localhost:5173`, `http://localhost` y la URL de Cloudflare (`https://tu-app.pages.dev`), sin barra final.
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

Abre <http://localhost:5173>. Vite reenvía `/api` a las Functions (puerto 8788). Si cambias algo en `functions/` o `server/`, reinicia `dev:api`.

## Despliegue en Cloudflare Pages

1. Cloudflare → *Workers & Pages → Create → Pages → Connect to Git* → `lagoanadia/prueba-1`, rama `main`.
2. Build: preset **React (Vite)** · command `npm run build` · output `dist`.
3. *Settings → Variables and Secrets* (Production): `VITE_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_ID`, `SESSION_SECRET` (tipo Secret), `GROQ_API_KEY` (Secret), opcional `GROQ_MODEL`.
4. Tras añadir/cambiar variables: *Deployments → Retry deployment* (las `VITE_` se incrustan al compilar).
5. Añade `https://tu-app.pages.dev` a los *Authorized JavaScript origins* de Google.
