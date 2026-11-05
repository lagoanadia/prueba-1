import { useEffect, useState } from 'react'
import { listEntries, addEntries, setDone } from '../services/entriesService.js'

/** Carga las entradas del usuario y ofrece add() y toggle(). */
export default function useEntries(enabled) {
  const [entries, setEntries] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) return
    listEntries().then(setEntries).catch((e) => setError(e.message))
  }, [enabled])

  const add = async (actions) => setEntries(await addEntries(actions))

  // "Optimista": cambiamos la UI al momento y, si el servidor falla, lo deshacemos.
  const toggle = async (id, done) => {
    const flip = (value) => (es) => es.map((e) => (e.id === id ? { ...e, done: value } : e))
    setEntries(flip(done))
    try {
      setEntries(await setDone(id, done))
    } catch (e) {
      setEntries(flip(!done))
      setError(e.message)
    }
  }

  return { entries, add, toggle, error }
}
