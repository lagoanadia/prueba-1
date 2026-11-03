/**
 * Capa de LÓGICA CON IA.
 *
 * La UI nunca habla con la IA directamente: solo llama a estas funciones.
 * Así cada una puede trabajar en su parte sin pisarse:
 *   - Interfaz: components/ y screens/
 *   - Lógica IA: este archivo (y los que salgan de aquí)
 *
 * De momento devuelven datos falsos (mock) con un retardo para simular la red.
 */

const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * @param {File} archivo  El archivo que eligió el usuario
 * @param {'pdf'|'pptx'} tipo
 * @returns {Promise<string>}
 */
export async function procesarArchivo(archivo, tipo) {
  // TODO (IA): extraer el texto del archivo y mandarlo al modelo.
  await esperar(800)
  return `(mock) Recibido ${tipo.toUpperCase()} "${archivo.name}" de ${Math.round(archivo.size / 1024)} KB.`
}

/**
 * @param {string} texto  Las notas escritas por el usuario
 * @returns {Promise<string>}
 */
export async function procesarNotas(texto) {
  // TODO (IA): mandar las notas al modelo.
  await esperar(800)
  return `(mock) Recibidas notas de ${texto.trim().split(/\s+/).length} palabras.`
}
