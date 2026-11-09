import { useEffect, useRef, useState } from 'react'
import Icon from '../Icon.jsx'
import { LANGS, highlight } from './highlight.js'

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
export default function CodeBlock({ block, onChange, focus, onFocused, onEmptyBackspace }) {
  const t = THEMES[block.theme] ?? THEMES.noche
  const code = block.code ?? ''
  const ta = useRef(null)
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
  const copy = async () => { try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1400) } catch { /* sin permiso del portapapeles */ } }
  const pickTheme = (id) => { set({ theme: id }); try { localStorage.setItem('codeTheme', id) } catch { /* sin almacenamiento */ } setMenu(null) }
  const onKey = (e) => {
    if (e.key === 'Tab') { e.preventDefault(); const el = e.currentTarget; const { selectionStart: a, selectionEnd: z } = el; const next = code.slice(0, a) + '  ' + code.slice(z); set({ code: next }); requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = a + 2 }) }
    if (e.key === 'Backspace' && !code) { e.preventDefault(); onEmptyBackspace?.() }
  }
  const vars = { '--cb-bg': t.bg, '--cb-fg': t.fg, '--cb-muted': t.muted, '--cb-chip': t.chip, '--cb-chipfg': t.chipfg, '--cb-k': t.k, '--cb-s': t.s, '--cb-f': t.f, '--cb-c': t.c, '--cb-n': t.n }

  return (
    <div className="cb" style={vars}>
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
      <div className="cb-edit">
        <pre className="cb-hl" aria-hidden="true" dangerouslySetInnerHTML={{ __html: `${highlight(code, block.lang)}\n` }} />
        <textarea ref={ta} value={code} onChange={(e) => set({ code: e.target.value })} onKeyDown={onKey} spellCheck={false} autoCapitalize="off" autoCorrect="off" aria-label="Código" placeholder="Escribe o pega tu código" />
      </div>
      <button className="cb-copy" onClick={copy} aria-label="Copiar código" title="Copiar">{copied ? <Icon name="check" size={16} /> : <Icon name="copy" size={16} />}</button>
    </div>
  )
}
