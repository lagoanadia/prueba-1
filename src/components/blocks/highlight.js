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

/**
 * ¿Es código lo que se ha pegado? Devuelve el lenguaje (uno de LANGS) o null si parece texto normal.
 * Mira marcas muy propias del código (llaves, punto y coma, flechas, palabras clave, etiquetas…) en varias líneas.
 */
export function detectCode(raw) {
  const text = String(raw ?? '').replace(/\r\n?/g, '\n').replace(/\n+$/, '')
  if (!text.trim() || text.length > 60000) return null
  const lines = text.split('\n').filter((l) => l.trim())
  const t = text.trim()
  // JSON válido
  if (/^[[{]/.test(t) && /[\]}]$/.test(t) && lines.length > 1) { try { JSON.parse(t); return 'JSON' } catch { /* no es JSON */ } }
  const has = (re) => lines.filter((l) => re.test(l)).length
  const lang = {
    HTML: has(/<\/?[a-z][a-z0-9-]*(\s[^<>]*)?\/?>/i) >= Math.max(1, lines.length * 0.6) && /^\s*</.test(t) ? 6 : 0,
    SQL: /^\s*(select|insert\s+into|update|delete\s+from|create\s+table|alter\s+table|with)\b/i.test(t) && /\b(from|into|set|values|table|where)\b/i.test(t) ? 6 : 0,
    Python: has(/^\s*(def|class)\s+\w+.*:\s*$/) * 3 + has(/^\s*(import \w+|from \w+(\.\w+)* import)\b/) * 2 + has(/^\s*(elif|except|with .* as)\b.*:\s*$/) * 2 + has(/\bprint\(|\bself\.|^\s*#\s/) + (/:\s*$/m.test(t) && !/[;{}]/.test(t) ? 1 : 0),
    Bash: has(/^#!.*\b(ba)?sh\b/) * 6 + has(/^\s*(\$ |sudo |apt(-get)? |npm |git |cd |ls\b|echo |chmod |export \w+=)/) * 2,
    Java: has(/\b(public|private|protected)\s+(static\s+)?(final\s+)?(class|void|int|String)\b/) * 3 + has(/System\.out\./) * 3,
    Kotlin: has(/^\s*(fun|val|data class|object)\s+\w+/) * 3,
    C: has(/^\s*#include\s*[<"]/) * 4 + has(/\b(int|void|char)\s+\w+\s*\(.*\)\s*\{?\s*$/) * 2 + has(/\b(printf|scanf)\(/) * 2,
    TypeScript: has(/^\s*(interface|type)\s+\w+/) * 3 + has(/\w+\s*:\s*(string|number|boolean|any)\b/) * 2,
    JavaScript: has(/^\s*(const|let|var)\s+[\w{[]/) * 2 + has(/=>/) * 2 + has(/\bfunction\b\s*\w*\(/) * 2 + has(/console\.\w+\(/) * 3 + has(/^\s*(import .* from |export (default )?|require\()/) * 2 + has(/^\s*(if|for|while)\s*\(.*\)\s*\{?\s*$/),
    CSS: has(/^\s*[.#]?[\w-][\w\s.#:>,-]*\{\s*$/) * 2 + has(/^\s*[\w-]+\s*:\s*[^;]+;\s*$/) * 2,
  }
  // marcas generales (sirven a cualquier lenguaje)
  const generic = has(/[;{}]\s*$/) + has(/^\s{2,}\S/) * 0.5 + has(/\w\(.*\)/) * 0.5
  let best = null
  let top = 0
  for (const [k, v] of Object.entries(lang)) if (v > top) { best = k; top = v }
  // TypeScript gana a JavaScript si tiene tipos; Kotlin/Java dudosos pasan por lo que más puntúe
  if (best === 'JavaScript' && lang.TypeScript > 0 && lang.TypeScript + 2 >= lang.JavaScript) best = 'TypeScript'
  if (!best) return generic >= Math.max(3, lines.length * 0.7) && lines.length >= 3 ? 'JavaScript' : null
  const need = lines.length === 1 ? 4 : 3
  return top + (generic >= 2 ? 1 : 0) >= need ? best : null
}
