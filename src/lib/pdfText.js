// Lee el principio de un PDF en el navegador (el archivo no sale de tu dispositivo; solo se envía un extracto del texto).
// pdf.js se carga solo cuando hace falta.
const MAX_PAGES = 8

export async function extractPdf(file, { maxChars = 1800 } = {}) {
  try {
    const pdfjs = await import('pdfjs-dist')
    if (!pdfjs.GlobalWorkerOptions.workerSrc) pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
    let text = ''
    for (let i = 1; i <= Math.min(pdf.numPages, MAX_PAGES) && text.length < maxChars; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      text += `${content.items.map((it) => it.str).join(' ')}\n`
    }
    text = text.replace(/\s+/g, ' ').trim()
    return { pages: pdf.numPages, text: text.slice(0, maxChars), readable: text.length > 40 }
  } catch {
    return { pages: null, text: '', readable: false } // PDF dañado, con contraseña o escaneado
  }
}

/** Texto de TODAS las páginas (hasta un máximo) para importar recetas: se devuelve página a página. */
export async function extractPdfPages(file, { maxPages = 80 } = {}) {
  try {
    const pdfjs = await import('pdfjs-dist')
    if (!pdfjs.GlobalWorkerOptions.workerSrc) pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
    const pages = []
    for (let i = 1; i <= Math.min(pdf.numPages, maxPages); i++) {
      const content = await (await pdf.getPage(i)).getTextContent()
      pages.push(content.items.map((it) => it.str).join(' ').replace(/\s+/g, ' ').trim())
    }
    return { total: pdf.numPages, pages, readable: pages.join('').length > 80 }
  } catch {
    return { total: 0, pages: [], readable: false }
  }
}
