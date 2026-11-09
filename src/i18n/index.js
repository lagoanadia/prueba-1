/*
 * IDIOMA DE LA APP (español / inglés)
 *
 * La interfaz está escrita en español. En inglés, un traductor recorre la página y cambia
 * cada texto, placeholder, título y etiqueta usando el diccionario de en.js. Así no hay que
 * tocar cada componente. Los números se respetan: "3 de 12 libros" usa la plantilla "{0} de {1} libros".
 * Se vigila la página (MutationObserver) para traducir también lo que aparece después.
 */
import EN, { RULES } from './en.js'

const KEY = 'inblocks:lang'
const ATTRS = ['placeholder', 'title', 'aria-label']
const NUM = /\d+(?:[.,:]\d+)*/g

export function getLang() {
  try { const l = localStorage.getItem(KEY); if (l === 'en' || l === 'es') return l } catch { /* sin almacenamiento */ }
  return (navigator.language ?? 'es').toLowerCase().startsWith('es') ? 'es' : 'en' // primera vez: el idioma del sistema
}
export const locale = () => (getLang() === 'en' ? 'en-GB' : 'es-ES')

/** Traduce una frase en español (exacta o con números). Si no está en el diccionario, se queda igual. */
export function tr(text) {
  if (getLang() !== 'en' || !text) return text
  const core = text.trim()
  if (!core) return text
  let out = EN[core]
  NUM.lastIndex = 0
  if (out === undefined && NUM.test(core)) {
    const nums = []
    const tpl = core.replace(NUM, (m) => `{${nums.push(m) - 1}}`)
    const hit = EN[tpl]
    if (hit !== undefined) out = hit.replace(/\{(\d)\}/g, (_, i) => nums[i])
  }
  NUM.lastIndex = 0
  if (out === undefined) {
    for (const [re, fn] of RULES) { const m = core.match(re); if (m) { out = fn(...m, tr); break } }
  }
  if (out === undefined) return text
  return text.replace(core, out) // conserva los espacios de alrededor
}

// ---------- Traductor de la página ----------
const original = new WeakMap() // nodo de texto -> texto en español
const originalAttr = new WeakMap() // elemento -> { atributo: texto en español }
let observer = null
const skip = (el) => !el || el.closest?.('script, style, textarea, [contenteditable="true"], [data-no-i18n]')

function doText(node) {
  if (skip(node.parentElement)) return
  const cur = node.nodeValue
  const known = original.get(node)
  // Si React cambió el texto, el nuevo español es la fuente; si es nuestra traducción, no hacemos nada
  const es = known && tr(known.es) === cur ? known.es : cur
  const en = tr(es)
  original.set(node, { es })
  if (en !== cur) node.nodeValue = en
}
function doAttrs(el) {
  if (skip(el)) return
  const saved = originalAttr.get(el) ?? {}
  for (const a of ATTRS) {
    const cur = el.getAttribute(a)
    if (cur == null) continue
    const es = saved[a] && tr(saved[a]) === cur ? saved[a] : cur
    saved[a] = es
    const en = tr(es)
    if (en !== cur) el.setAttribute(a, en)
  }
  originalAttr.set(el, saved)
}
function walk(root) {
  if (root.nodeType === 3) return doText(root)
  if (root.nodeType !== 1) return
  doAttrs(root)
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  let n
  while ((n = w.nextNode())) n.nodeType === 3 ? doText(n) : doAttrs(n)
}
function restore(root) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  let n
  while ((n = w.nextNode())) {
    if (n.nodeType === 3) { const o = original.get(n); if (o) n.nodeValue = o.es }
    else { const o = originalAttr.get(n); if (o) for (const [a, v] of Object.entries(o)) n.setAttribute(a, v) }
  }
}

/** Activa el idioma: guarda la elección y traduce (o devuelve al español) toda la página. */
export function applyLang(lang = getLang()) {
  try { localStorage.setItem(KEY, lang) } catch { /* nada */ }
  document.documentElement.lang = lang
  observer?.disconnect()
  observer = null
  if (lang !== 'en') { restore(document.body); return }
  walk(document.body)
  observer = new MutationObserver((list) => {
    observer.disconnect() // nuestros propios cambios no deben volver a dispararlo
    for (const m of list) {
      if (m.type === 'characterData') doText(m.target)
      else if (m.type === 'attributes') doAttrs(m.target)
      else m.addedNodes.forEach(walk)
    }
    observer.observe(document.body, OPTS)
  })
  observer.observe(document.body, OPTS)
}
const OPTS = { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS }

/** El idioma guardado en tu cuenta manda: si es otro, se aplica y se recarga UNA vez (nunca en bucle). */
export function syncLang(lang) {
  applyLang(lang)
  try {
    if (sessionStorage.getItem('inblocks:lang-sync') === lang) return
    sessionStorage.setItem('inblocks:lang-sync', lang)
  } catch { return }
  location.reload()
}
