# Reglas del proyecto

- Interfaz en **español**. Nombres de código en inglés; comentarios en español.
- **Menos texto**: nada de cabeceras ni subtítulos innecesarios. Etiquetas cortas.
- **Lo pasado va al historial**: todo lo que ya ocurrió (botellas abiertas, días anteriores, entradas antiguas…) no se muestra en pantalla; se abre en un pop-up desde el icono de reloj (`src/components/History.jsx`).
- Estilo del prototipo: Poppins, colores de `src/data/areas.js`, iconos de trazo de `src/components/Icon.jsx`, sombras suaves y animaciones discretas (respetar `prefers-reduced-motion`).
- Widgets: cada uno tiene vista S (1x1), M (2x1) y L (2x2). Se registran en `src/widgets/registry.js`.
- **Sin datos de ejemplo**: la primera vez que se abre un área se hacen unas preguntas (`src/onboarding/flows.js`) y con las respuestas se rellenan sus widgets. Un área nueva necesita su flujo de preguntas.
- El asistente solo PROPONE; nada se guarda sin confirmación del usuario.
- La API key de Groq y los secretos solo viven en el Worker (`worker/`, `server/`).
