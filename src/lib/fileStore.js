// Archivos subidos (PDF, imágenes…): se guardan en el navegador (IndexedDB), no en el servidor.
// Por eso solo se ven en este dispositivo. Los datos del tablero guardan solo el id del archivo.
const DB = 'organizador-files'
const STORE = 'files'

const open = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB, 1)
  req.onupgradeneeded = () => req.result.createObjectStore(STORE)
  req.onsuccess = () => resolve(req.result)
  req.onerror = () => reject(req.error)
})
const run = async (mode, fn) => {
  const db = await open()
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Guarda un archivo y devuelve { id, name, type }. */
export async function saveFile(file) {
  const id = crypto.randomUUID()
  await run('readwrite', (s) => s.put(file, id))
  return { id, name: file.name, type: file.type }
}
export const getFile = (id) => run('readonly', (s) => s.get(id))
export const deleteFile = (id) => run('readwrite', (s) => s.delete(id))
