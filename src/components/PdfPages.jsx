import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'

/**
 * PDF dibujado como páginas limpias dentro de la pantalla (sin la barra del visor del navegador): se ajusta al ancho,
 * con página actual y zoom. Las páginas se pintan solo cuando se acercan, para que los PDF largos vayan ligeros.
 */
export default function PdfPages({ blob, name, onFallback }) {
  const box = useRef(null)
  const [pdf, setPdf] = useState(null)
  const [width, setWidth] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [current, setCurrent] = useState(1)

  useEffect(() => {
    let dead = false
    ;(async () => {
      try {
        const pdfjs = await import('pdfjs-dist')
        if (!pdfjs.GlobalWorkerOptions.workerSrc) pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
        const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise
        if (!dead) setPdf(doc)
      } catch { if (!dead) onFallback?.() } // si no se puede dibujar, se usa el visor del navegador
    })()
    return () => { dead = true }
  }, [blob]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = box.current
    if (!el) return undefined
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const open = () => { const url = URL.createObjectURL(blob); window.open(url, '_blank'); setTimeout(() => URL.revokeObjectURL(url), 60000) }

  return (
    <div className="pdfp">
      <div className="pdfp-bar">
        <span className="pdfp-count">{pdf ? `Página ${current} de ${pdf.numPages}` : 'Abriendo…'}</span>
        <button className="icon-btn" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)))} aria-label="Alejar" title="Alejar"><Icon name="minus" size={16} /></button>
        <button className="icon-btn" onClick={() => setZoom((z) => Math.min(3, +(z + 0.15).toFixed(2)))} aria-label="Acercar" title="Acercar"><Icon name="plus" size={16} /></button>
        <button className="icon-btn" onClick={open} aria-label="Abrir en el visor del navegador (buscar y copiar texto)" title="Abrir en el navegador"><Icon name="expand" size={16} /></button>
      </div>
      <div className="pdfp-pages" ref={box}>
        {pdf && width > 0 && Array.from({ length: pdf.numPages }, (_, i) => <PdfPage key={i} pdf={pdf} n={i + 1} width={Math.max(120, width - 4) * zoom} root={box} onSeen={setCurrent} />)}
      </div>
    </div>
  )
}

function PdfPage({ pdf, n, width, root, onSeen }) {
  const wrap = useRef(null)
  const canvas = useRef(null)
  const [size, setSize] = useState({ w: width, h: width * 1.414 })
  const [near, setNear] = useState(n <= 2)
  const [drawn, setDrawn] = useState('')

  useEffect(() => {
    let dead = false
    pdf.getPage(n).then((p) => { if (dead) return; const v = p.getViewport({ scale: 1 }); setSize({ w: width, h: (width * v.height) / v.width }) })
    return () => { dead = true }
  }, [pdf, n, width])

  // Se pinta cuando se acerca a la zona visible; la página que ocupa el centro es la «actual»
  useEffect(() => {
    const el = wrap.current
    if (!el) return undefined
    const near_ = new IntersectionObserver(([e]) => { if (e.isIntersecting) setNear(true) }, { root: root.current, rootMargin: '600px 0px' })
    const mid = new IntersectionObserver(([e]) => { if (e.isIntersecting) onSeen(n) }, { root: root.current, rootMargin: '-45% 0px -45% 0px' })
    near_.observe(el); mid.observe(el)
    return () => { near_.disconnect(); mid.disconnect() }
  }, [n, root, onSeen])

  useEffect(() => {
    if (!near) return undefined
    const key = `${Math.round(width)}`
    if (drawn === key) return undefined
    let task = null
    let dead = false
    pdf.getPage(n).then((p) => {
      if (dead || !canvas.current) return
      const base = p.getViewport({ scale: 1 })
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const vp = p.getViewport({ scale: (width / base.width) * dpr })
      const c = canvas.current
      c.width = vp.width; c.height = vp.height
      task = p.render({ canvasContext: c.getContext('2d'), viewport: vp })
      task.promise.then(() => { if (!dead) setDrawn(key) }).catch(() => {})
    })
    return () => { dead = true; task?.cancel?.() }
  }, [near, pdf, n, width]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={wrap} className="pdfp-page" style={{ width: size.w, height: size.h }}>
      <canvas ref={canvas} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
