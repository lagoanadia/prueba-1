# StudyBuddy (PWA hackathon)

Asistente con IA que organiza tu material escolar. Frontend en React + Vite, backend en funciones serverless de Vercel, IA con Groq y login con Google.

## Estructura

```
api/                    ← BACKEND: cada archivo es un endpoint (Vercel)
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
   - Configura la *OAuth consent screen* (tipo External, modo Testing, añade vuestros emails como test users).
   - *Create credentials → OAuth client ID → Web application*.
   - En **Authorized JavaScript origins** añade `http://localhost:3000`, `http://localhost` y, cuando despleguéis, la URL de Vercel (`https://tu-app.vercel.app`).
2. **Groq API key** — <https://console.groq.com/keys>
3. Copia `.env.example` a `.env.local` y rellénalo.
4. Instala y arranca (frontend + `/api` juntos):

```bash
npm install
npm i -g vercel
vercel dev
```

Abre <http://localhost:3000>. (`npm run dev` arranca solo Vite, sin `/api`: el login no funcionará.)

## Despliegue en Vercel

1. Importa el repo en <https://vercel.com/new> (detecta Vite solo).
2. *Settings → Environment Variables*: añade las mismas variables de `.env.local`.
3. Añade la URL de producción a los *Authorized JavaScript origins* de Google.
