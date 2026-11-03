/**
 * Capa de VOZ + IA (de momento MOCK, modo wireframe).
 *
 * Flujo real previsto:
 *   1. transcribe(audioBlob)  -> POST /api/transcribe -> Groq Whisper -> texto
 *   2. runCommand(text)       -> POST /api/command    -> Groq con "tool calling"
 *      El modelo decide QUÉ acciones hacer y en QUÉ sección, y devuelve:
 *      { reply: "Done...", actions: [{ section: 'gym', title: '3x10 squats' }] }
 *
 * La UI solo depende de estas dos funciones: cuando las hagamos reales, la UI no cambia.
 */

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const SAMPLES = [
  { text: 'Today I did 3 sets of squats and 20 minutes of running', section: 'gym', title: '3x squats + 20 min run' },
  { text: 'I read 10 pages, mark my reading habit as done', section: 'habits', title: 'Reading: 10 pages' },
  { text: 'Add a math exam next Friday', section: 'class', title: 'Math exam (next Friday)' },
  { text: 'Batch cook chicken and rice for 4 days on Sunday', section: 'food', title: 'Batch cooking: chicken & rice x4' },
]

export async function transcribe(/* audioBlob */) {
  await wait(700)
  return SAMPLES[Math.floor(Math.random() * SAMPLES.length)].text
}

export async function runCommand(text) {
  await wait(700)
  const match = SAMPLES.find((s) => s.text === text) ?? SAMPLES[0]
  return {
    reply: `Added to ${match.section}.`,
    actions: [{ section: match.section, title: match.title }],
  }
}
