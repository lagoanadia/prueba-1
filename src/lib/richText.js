// Limpia el HTML de los apuntes: solo se permiten etiquetas de formato, nunca scripts ni atributos.
const TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'P', 'DIV', 'BR', 'SPAN', 'MARK'])

export function sanitize(html) {
  const doc = new DOMParser().parseFromString(`<body>${html ?? ''}</body>`, 'text/html')
  const clean = (node) => {
    ;[...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) return
      if (n.nodeType !== 1 || !TAGS.has(n.tagName)) { n.remove(); return }
      const bg = n.tagName === 'SPAN' ? n.style.backgroundColor : ''
      ;[...n.attributes].forEach((a) => n.removeAttribute(a.name))
      if (bg) n.style.backgroundColor = bg
      clean(n)
    })
  }
  clean(doc.body)
  return doc.body.innerHTML
}

/** Apuntes antiguos (lista de bloques) → HTML. */
export function legacyToHtml(blocks) {
  const esc = (t) => String(t ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
  return blocks.filter((b) => b.type !== 'image').map((b) => {
    if (b.type === 'title') return `<h2>${esc(b.text)}</h2>`
    if (b.type === 'subtitle') return `<h3>${esc(b.text)}</h3>`
    if (b.type === 'list' || b.type === 'outline') return `<ul>${b.text.split('\n').filter(Boolean).map((l) => `<li>${esc(l.trim())}</li>`).join('')}</ul>`
    if (b.type === 'highlight') return `<p><mark>${esc(b.text)}</mark></p>`
    return `<p>${esc(b.text)}</p>`
  }).join('')
}
