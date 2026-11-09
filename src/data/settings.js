// Ajustes del usuario (se guardan en su perfil). Lo usan el frontend y el backend.
import { AREA_IDS } from './areas.js'

export const DEFAULT_SETTINGS = {
  areas: Object.fromEntries(AREA_IDS.map((id) => [id, { added: true, active: true }])),
  bigText: false,
  iconsOnly: false, // barra lateral solo con iconos
}

/** Completa lo que falte y descarta lo desconocido. */
export function normalizeSettings(raw) {
  const areas = Object.fromEntries(AREA_IDS.map((id) => {
    const a = raw?.areas?.[id]
    const added = a?.added !== false
    return [id, { added, active: added && a?.active !== false }]
  }))
  return { areas, bigText: raw?.bigText === true, iconsOnly: raw?.iconsOnly === true }
}

/** Ids de las áreas que se ven en la barra lateral. */
export const activeAreaIds = (settings) => AREA_IDS.filter((id) => settings.areas[id]?.active)
