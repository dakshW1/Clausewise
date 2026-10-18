// Reading PDFs in the browser: the text layer of digital PDFs, or page images for scanned ones.

async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist')
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  return pdfjs
}

export const isPdf = (file) => file?.type === 'application/pdf' || /\.pdf$/i.test(file?.name || '')

export async function openPdf(file, maxPages = 8) {
  const pdfjs = await loadPdfjs()
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const count = Math.min(pdf.numPages, maxPages)
  const pages = []
  for (let i = 1; i <= count; i++) {
    const content = await (await pdf.getPage(i)).getTextContent()
    pages.push(content.items.map((it) => it.str + (it.hasEOL ? '\n' : ' ')).join('').replace(/[ \t]+\n/g, '\n').trim())
  }
  const text = pages.join('\n\n').trim()
  // A scanned PDF has little or no text layer; treat it as images instead.
  const digital = text.replace(/\s/g, '').length >= 200
  return { pdf, count, total: pdf.numPages, text, digital }
}

// Render pages at a fixed width and stack them into one tall canvas, remembering where each page starts.
export async function renderPages(pdf, count, width = 1240) {
  const canvases = []
  for (let i = 1; i <= count; i++) {
    const page = await pdf.getPage(i)
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: width / base.width })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    await page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport }).promise
    canvases.push(canvas)
  }
  const sheet = document.createElement('canvas')
  sheet.width = width
  sheet.height = canvases.reduce((h, c) => h + c.height, 0)
  const ctx = sheet.getContext('2d')
  const breaks = []
  let y = 0
  for (const c of canvases) {
    breaks.push({ y, h: c.height })
    ctx.drawImage(c, 0, y)
    y += c.height
  }
  return { sheet, breaks }
}
