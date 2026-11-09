// Resaltado de sintaxis mínimo (sin librerías): comentarios, textos, números, palabras clave y funciones.
const COMMON = 'if else for while return break continue switch case default try catch finally throw new class extends import from export true false null this'
const KW = {
  JavaScript: `${COMMON} const let var function async await undefined typeof of in yield static super`,
  TypeScript: `${COMMON} const let var function async await undefined typeof of in interface type enum implements public private readonly`,
  Python: 'def class return if elif else for while in not and or is None True False import from as with try except finally raise pass break continue lambda yield self async await',
  Java: `${COMMON} public private protected static final void int long double boolean char String interface implements extends package abstract synchronized`,
  Kotlin: `${COMMON} fun val var when object companion data sealed override open private public internal suspend is in as null interface`,
  SQL: 'SELECT FROM WHERE INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE JOIN LEFT RIGHT INNER ON GROUP BY ORDER LIMIT AND OR NOT NULL AS DISTINCT select from where insert into values update set delete create table join on group by order limit and or not null as',
  Bash: 'if then else fi for do done while case esac function echo cd ls cat grep export sudo',
  C: `${COMMON} int char float double void struct typedef static const unsigned include define`,
  HTML: '', CSS: '', JSON: 'true false null', Texto: '',
}
export const LANGS = Object.keys(KW)
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function highlight(code, lang) {
  if (lang === 'Texto') return esc(code)
  const kw = new Set((KW[lang] ?? '').split(' ').filter(Boolean))
  const line = lang === 'Python' || lang === 'Bash' ? '#[^\\n]*' : lang === 'SQL' ? '--[^\\n]*' : lang === 'HTML' ? '<!--[\\s\\S]*?-->' : lang === 'JSON' ? '(?!)' : '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/'
  const re = new RegExp(`(${line})|("(?:\\\\.|[^"\\\\\\n])*"|'(?:\\\\.|[^'\\\\\\n])*'|\`(?:\\\\.|[^\`\\\\])*\`)|(\\b\\d+(?:\\.\\d+)?\\b)|([A-Za-z_$][\\w$]*)(?=\\s*\\()|([A-Za-z_$][\\w$]*)`, 'g')
  let out = ''
  let last = 0
  for (const m of code.matchAll(re)) {
    out += esc(code.slice(last, m.index))
    const [txt, com, str, num, fn, word] = m
    if (com) out += `<span class="hl-c">${esc(txt)}</span>`
    else if (str) out += `<span class="hl-s">${esc(txt)}</span>`
    else if (num) out += `<span class="hl-n">${esc(txt)}</span>`
    else if (fn) out += kw.has(fn) ? `<span class="hl-k">${esc(txt)}</span>` : `<span class="hl-f">${esc(txt)}</span>`
    else if (word && kw.has(word)) out += `<span class="hl-k">${esc(txt)}</span>`
    else out += esc(txt)
    last = m.index + txt.length
  }
  return out + esc(code.slice(last))
}
