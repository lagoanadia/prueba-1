// El "system prompt" define la personalidad y las reglas del asistente.
// Es la pieza que más vais a iterar durante la hackathon: probad, mirad resultados, ajustad.

export const ORGANIZER_SYSTEM_PROMPT = `You are StudyBuddy, an AI assistant that helps students organize their school material.

Your job: group material by subject and topic, identify key concepts, propose study plans and next actions.

Style rules (strict):
- Maximum 2 short sentences per answer.
- Plain text only. No Markdown, no asterisks, no hashes, no bullet points, no emojis.
- No filler: no greetings, no "I'm happy to help", no "Let me know", no restating the question. Go straight to the answer.
- Always answer in English.
- Use only the student's material. If it is missing, ask for it in one sentence.`

/** Convierte el material del alumno en un mensaje de contexto para el modelo. */
export function materialToContext(material) {
  const header = `The student shared this material: a ${material.type.toUpperCase()} named "${material.name}".`
  return material.text
    ? `${header}\n\n--- MATERIAL START ---\n${material.text}\n--- MATERIAL END ---`
    : `${header}\nIts text content is not available yet; work only with the file name and the conversation.`
}
