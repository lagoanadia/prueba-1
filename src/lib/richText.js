// Limpia el HTML de los apuntes: solo se permiten etiquetas de formato, nunca scripts ni atributos.
const TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'P', 'DIV', 'BR', 'SPAN', 'MARK', 'CODE'])

const HL = new Set(['amarillo', 'naranja', 'rosa', 'azul', 'verde', 'morado'])

// Fondo casi blanco (lo que traen las líneas pegadas de otras páginas): no se conserva
const nearWhite = (c) => { const m = /rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(c || ''); return Boolean(m) && +m[1] >= 235 && +m[2] >= 235 && +m[3] >= 235 }

/** `bg: false` quita también los fondos de color (al pegar de fuera). Los subrayados propios usan data-hl y se conservan siempre. */
export function sanitize(html, { bg: keepBg = true } = {}) {
  const doc = new DOMParser().parseFromString(`<body>${html ?? ''}</body>`, 'text/html')
  const clean = (node) => {
    ;[...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) return
      if (n.nodeType !== 1 || !TAGS.has(n.tagName)) { n.remove(); return }
      const bg = n.tagName === 'SPAN' && keepBg && !nearWhite(n.style.backgroundColor) ? n.style.backgroundColor : ''
      const hl = n.tagName === 'SPAN' && HL.has(n.getAttribute('data-hl')) ? n.getAttribute('data-hl') : '' // subrayador: color del post-it
      ;[...n.attributes].forEach((a) => n.removeAttribute(a.name))
      if (bg) n.style.backgroundColor = bg
      if (hl) n.setAttribute('data-hl', hl)
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
