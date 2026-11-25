import { useEffect, useRef, useState } from 'react'
import Icon from '../Icon.jsx'
import { LANGS, highlight } from './highlight.js'
import { POSTIT_COLORS } from '../../lib/docModel.js'

// Tres temas: noche (por defecto), claro y cálido
export const THEMES = {
  noche: { name: 'Noche', bg: '#161B2E', fg: '#E7EAF6', muted: '#7E87A8', chip: '#232A45', chipfg: '#C9D0F0', k: '#B692FF', s: '#6EE7C8', f: '#7AA7FF', c: '#5D668A', n: '#FFB86B' },
  claro: { name: 'Claro', bg: '#F6F8FF', fg: '#2D3142', muted: '#8A91A8', chip: '#E9EDFF', chipfg: '#4B55A8', k: '#7C5CFF', s: '#12A594', f: '#2F6BFF', c: '#A0A7BD', n: '#E0701B' },
  calido: { name: 'Cálido', bg: '#2A2430', fg: '#F3ECE4', muted: '#9C8F9F', chip: '#3A3342', chipfg: '#F3ECE4', k: '#FF8FA3', s: '#FFD479', f: '#7FD6C2', c: '#7A6E80', n: '#FFA36B' },
}

/**
 * Bloque de código minimalista: texto sobre fondo de color, etiqueta de lenguaje y un círculo para elegir el tema.
 * El resaltado va en una capa detrás del campo de texto (misma tipografía) para poder editar con normalidad.
 */
export default function CodeBlock({ block, onChange, focus, onFocused, onEmptyBackspace, pen = null }) {
  const t = THEMES[block.theme] ?? THEMES.noche
  const code = block.code ?? ''
  const ta = useRef(null)
  const edit = useRef(null)
  const [drag, setDrag] = useState(null) // marcas provisionales mientras pasas el subrayador por las líneas
  const [menu, setMenu] = useState(null) // 'lang' | 'theme' | null
  const [copied, setCopied] = useState(false)
  useEffect(() => { if (focus) { ta.current?.focus(); onFocused?.() } }, [focus])
  useEffect(() => {
    if (!menu) return
    const close = (e) => { if (!e.target.closest?.('.cb-tools')) setMenu(null) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [menu])

  const set = (p) => onChange({ ...block, ...p })
  // Subrayador en el código: se marcan líneas enteras (banda y raya de color); con la goma se quitan
  const total = code.split('\n').length
  const marks = drag?.marks ?? block.marks ?? {}
  const lineAt = (e) => { const r = edit.current.getBoundingClientRect(); return Math.max(0, Math.min(total - 1, Math.floor(((e.clientY - r.top) / (r.height || 1)) * total))) }
  const paintDown = (e) => {
    if (!pen?.on || e.button !== 0) return
    e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId)
    const line = lineAt(e)
    const erase = pen.color === 'none' || block.marks?.[line] === pen.color // volver a pasar por una línea del mismo color la quita
    const start = { ...(block.marks ?? {}) }
    const apply = (m, a, b) => { for (let i = Math.min(a, b); i <= Math.max(a, b); i++) { if (erase) delete m[i]; else m[i] = pen.color } return m }
    setDrag({ from: line, base: start, erase, marks: apply({ ...start }, line, line) })
  }
  const paintMove = (e) => {
    if (!drag) return
    const line = lineAt(e)
    const m = { ...drag.base }
    for (let i = Math.min(drag.from, line); i <= Math.max(drag.from, line); i++) { if (drag.erase) delete m[i]; else m[i] = pen.color }
    setDrag((d) => (d ? { ...d, marks: m } : d))
  }
  const paintUp = () => {
    if (!drag) return
    const m = Object.fromEntries(Object.entries(drag.marks).filter(([i]) => Number(i) < total))
    setDrag(null)
    set({ marks: Object.keys(m).length ? m : undefined })
  }
  const copy = async () => { try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1400) } catch { /* sin permiso del portapapeles */ } }
  const pickTheme = (id) => { set({ theme: id }); try { localStorage.setItem('codeTheme', id) } catch { /* sin almacenamiento */ } setMenu(null) }
  const onKey = (e) => {
    if (e.key === 'Tab') { e.preventDefault(); const el = e.currentTarget; const { selectionStart: a, selectionEnd: z } = el; const next = code.slice(0, a) + '  ' + code.slice(z); set({ code: next }); requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = a + 2 }) }
    if (e.key === 'Backspace' && !code) { e.preventDefault(); onEmptyBackspace?.() }
  }
  const vars = { '--cb-bg': t.bg, '--cb-fg': t.fg, '--cb-muted': t.muted, '--cb-chip': t.chip, '--cb-chipfg': t.chipfg, '--cb-k': t.k, '--cb-s': t.s, '--cb-f': t.f, '--cb-c': t.c, '--cb-n': t.n }

  return (
    <div className={`cb ${block.title ? 'has-title' : ''}`} style={vars}>
      <div className="cb-head" aria-hidden="true" />
      <input className="cb-title" value={block.title ?? ''} onChange={(e) => set({ title: e.target.value || undefined })} placeholder="Título del código" aria-label="Título del código" maxLength={120} spellCheck />
      <div className="cb-tools">
        <span className="cb-themes">
          {menu === 'theme'
            ? Object.entries(THEMES).map(([id, th]) => <button key={id} className={`cb-sw ${block.theme === id || (!block.theme && id === 'noche') ? 'on' : ''}`} style={{ background: th.bg }} onClick={() => pickTheme(id)} aria-label={`Tema ${th.name}`} title={th.name} />)
            : <button className="cb-sw" style={{ background: t.bg }} onClick={() => setMenu('theme')} aria-label="Cambiar el tema del código" title="Tema" />}
        </span>
        <span className="cb-langwrap">
          <button className="cb-lang" onClick={() => setMenu(menu === 'lang' ? null : 'lang')} aria-haspopup="listbox" aria-expanded={menu === 'lang'} aria-label={`Lenguaje: ${block.lang}`}>{block.lang}<Icon name="down" size={12} strokeWidth={2.8} /></button>
          {menu === 'lang' && (
            <div className="card cb-langs" role="listbox" aria-label="Lenguaje">
              {LANGS.map((l) => <button key={l} role="option" aria-selected={l === block.lang} className={l === block.lang ? 'on' : ''} onClick={() => { set({ lang: l }); setMenu(null) }}>{l}</button>)}
            </div>
          )}
        </span>
      </div>
      <div className={`cb-edit ${pen?.on ? 'is-painting' : ''}`} ref={edit}>
        <div className="cb-marks" aria-hidden="true">
          {Object.entries(marks).filter(([i]) => Number(i) < total).map(([i, c]) => <i key={i} className="cb-mk" style={{ '--i': i, '--m': (POSTIT_COLORS[c] ?? POSTIT_COLORS.amarillo).bar }} />)}
        </div>
        <pre className="cb-hl" aria-hidden="true" dangerouslySetInnerHTML={{ __html: `${highlight(code, block.lang)}\n` }} />
        <textarea ref={ta} value={code} onChange={(e) => set({ code: e.target.value })} onKeyDown={onKey} spellCheck={false} autoCapitalize="off" autoCorrect="off" aria-label="Código" placeholder="Escribe o pega tu código" />
      </div>
      {pen?.on && <div className="cb-paint" onPointerDown={paintDown} onPointerMove={paintMove} onPointerUp={paintUp} onPointerCancel={paintUp} />}
      <button className="cb-copy" onClick={copy} aria-label="Copiar código" title="Copiar">{copied ? <Icon name="check" size={16} /> : <Icon name="copy" size={16} />}</button>
    </div>
  )
}
