// Pequeñas ayudas de tiempo para los widgets de Salud
export const toMin = (hhmm) => { const [h, m] = (hhmm || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0) }
export const fromMin = (m) => { const x = ((m % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}` }
export const fmtHM = (min) => { const h = Math.floor(min / 60); const m = min % 60; return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min` }
export const fmtNum = (n) => Number(n).toLocaleString('es-ES')
