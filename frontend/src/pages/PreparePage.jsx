import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, EyeOff, LoaderCircle, ScanText, ShieldCheck, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { EASE, Words } from '../components/motion-bits'
import { Logo } from '../components/ui'
import { useStore } from '../lib/store'

const ID_PATTERNS = [
  { kind: 'PAN', test: (t) => /^[A-Z]{5}\d{4}[A-Z]$/.test(t) },
  { kind: 'Phone', test: (t) => /^(\+?91)?[6-9]\d{9}$/.test(t.replace(/[\s-]/g, '')) },
]

// Words from Tesseract, whichever shape this version returns them in.
function wordsOf(data) {
  if (data.words?.length) return data.words
  return (data.blocks || []).flatMap((b) => b.paragraphs || []).flatMap((p) => p.lines || []).flatMap((l) => l.words || [])
}

// Aadhaar is printed as three groups of four digits; PAN and phone numbers are single tokens.
function findIds(words) {
  const boxes = []
  for (let i = 0; i < words.length; i++) {
    const t = words[i].text.replace(/[^\dA-Z+]/gi, '')
    const three = words.slice(i, i + 3)
    if (three.length === 3 && three.every((w) => /^\d{4}$/.test(w.text.replace(/\D/g, ''))) && /^[2-9]/.test(three[0].text.replace(/\D/g, ''))) {
      const b = three.map((w) => w.bbox)
      boxes.push({ kind: 'Aadhaar', x0: Math.min(...b.map((v) => v.x0)), y0: Math.min(...b.map((v) => v.y0)), x1: Math.max(...b.map((v) => v.x1)), y1: Math.max(...b.map((v) => v.y1)) })
      i += 2
      continue
    }
    const hit = ID_PATTERNS.find((p) => p.test(t.toUpperCase()))
    if (hit) boxes.push({ kind: hit.kind, ...words[i].bbox })
  }
  return boxes
}

// Before anything is uploaded: blur private details on the photo, by hand or automatically.
export default function PreparePage() {
  const { job, setJob } = useStore()
  const navigate = useNavigate()
  const file = job?.file
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  const [img, setImg] = useState(null)
  const [boxes, setBoxes] = useState([])
  const [draft, setDraft] = useState(null)
  const [scan, setScan] = useState({ state: 'idle', progress: 0, found: 0 })
  const [busy, setBusy] = useState(false)
  const stage = useRef(null)

  useEffect(() => {
    if (!url) return
    const im = new Image()
    im.onload = () => setImg(im)
    im.src = url
    return () => URL.revokeObjectURL(url)
  }, [url])

  if (!file) return <Navigate to="/" replace />

  // Pointer position in the photo's own pixels, whatever size it is shown at.
  const toImage = (e) => {
    const r = stage.current.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * img.naturalWidth, y: ((e.clientY - r.top) / r.height) * img.naturalHeight }
  }
  const onDown = (e) => { if (!img) return; e.currentTarget.setPointerCapture(e.pointerId); const p = toImage(e); setDraft({ x0: p.x, y0: p.y, x1: p.x, y1: p.y }) }
  const onMove = (e) => { if (draft) { const p = toImage(e); setDraft((d) => ({ ...d, x1: p.x, y1: p.y })) } }
  const onUp = () => {
    if (draft && Math.abs(draft.x1 - draft.x0) > 8 && Math.abs(draft.y1 - draft.y0) > 8) {
      setBoxes((b) => [...b, { kind: 'Hidden', x0: Math.min(draft.x0, draft.x1), y0: Math.min(draft.y0, draft.y1), x1: Math.max(draft.x0, draft.x1), y1: Math.max(draft.y0, draft.y1) }])
    }
    setDraft(null)
  }

  async function autoFind() {
    setScan({ state: 'running', progress: 0, found: 0 })
    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('eng', 1, { logger: (m) => m.status === 'recognizing text' && setScan((s) => ({ ...s, progress: m.progress })) })
      const { data } = await worker.recognize(file, {}, { blocks: true })
      await worker.terminate()
      const found = findIds(wordsOf(data)).map((b) => ({ ...b, x0: b.x0 - 6, y0: b.y0 - 6, x1: b.x1 + 6, y1: b.y1 + 6 }))
      setBoxes((b) => [...b, ...found])
      setScan({ state: 'done', progress: 1, found: found.length })
    } catch {
      setScan({ state: 'failed', progress: 0, found: 0 })
    }
  }

  // Pixelate each box on a full-size copy of the photo, so the original never leaves the device.
  async function proceed(redacted) {
    setBusy(true)
    let out = file
    if (redacted && boxes.length) {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const tiny = document.createElement('canvas')
      for (const b of boxes) {
        const w = Math.max(1, b.x1 - b.x0)
        const h = Math.max(1, b.y1 - b.y0)
        tiny.width = Math.max(1, Math.round(w / 18))
        tiny.height = Math.max(1, Math.round(h / 18))
        tiny.getContext('2d').drawImage(canvas, b.x0, b.y0, w, h, 0, 0, tiny.width, tiny.height)
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(tiny, 0, 0, tiny.width, tiny.height, b.x0, b.y0, w, h)
      }
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.92))
      out = new File([blob], 'document-redacted.jpg', { type: 'image/jpeg' })
    }
    setJob({ ...job, file: out })
    navigate('/scan')
  }

  const pct = (v, total) => `${(v / total) * 100}%`
  const shown = draft ? [...boxes, { kind: '', ...draft, x0: Math.min(draft.x0, draft.x1), y0: Math.min(draft.y0, draft.y1), x1: Math.max(draft.x0, draft.x1), y1: Math.max(draft.y0, draft.y1), draft: true }] : boxes

  return (
    <motion.div key="prepare" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, filter: 'blur(8px)' }} className="grain relative min-h-screen bg-night text-night-text">
      <header className="relative z-10 mx-auto flex h-18 max-w-[1240px] items-center justify-between px-4 sm:px-6">
        <Link to="/" aria-label="Clausewise home"><Logo dark /></Link>
        <span className="flex items-center gap-2 text-xs font-bold text-night-muted"><ShieldCheck size={14} /> Nothing has been uploaded yet</span>
      </header>
      <main className="relative z-10 mx-auto grid max-w-[1240px] gap-8 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[1fr_380px]">
        <div>
          <h1 className="font-display text-[clamp(32px,4.4vw,60px)] font-extrabold leading-[0.95] tracking-[-0.045em]">
            <Words text="Hide what’s private" />{' '}
            <span className="font-serif font-normal italic text-glow-heat"><Words text="before it leaves your phone." delay={0.2} /></span>
          </h1>
          <p className="mt-3 max-w-xl text-[15px] font-medium text-night-text/70">Drag over anything private, like an Aadhaar number, signature or phone number, to blur it. Only the blurred photo is sent for analysis.</p>
          <div
            ref={stage}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            className="relative mt-6 w-full max-w-[720px] cursor-crosshair touch-none select-none overflow-hidden rounded-2xl bg-night-2"
          >
            {url && <img src={url} alt="Your document" className="pointer-events-none block w-full" draggable={false} />}
            {img && (
              <AnimatePresence>
                {shown.map((b, i) => (
                  <motion.div
                    key={b.draft ? 'draft' : `${b.x0}-${b.y0}-${i}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`absolute rounded-md border-2 ${b.draft ? 'border-dashed border-white/80' : 'border-white'}`}
                    style={{ left: pct(b.x0, img.naturalWidth), top: pct(b.y0, img.naturalHeight), width: pct(b.x1 - b.x0, img.naturalWidth), height: pct(b.y1 - b.y0, img.naturalHeight), backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', background: 'rgba(13,13,14,0.25)' }}
                  >
                    {!b.draft && (
                      <>
                        <span className="absolute -top-6 left-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold text-ink">{b.kind}</span>
                        <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => setBoxes((all) => all.filter((_, j) => j !== i))} className="absolute -right-2.5 -top-2.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white text-ink" aria-label="Remove blur"><X size={13} /></button>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-4 lg:pt-28">
          <div className="rounded-[24px] border border-night-line bg-night-2/80 p-5 backdrop-blur">
            <p className="flex items-center gap-2 text-[15px] font-extrabold"><ScanText size={17} /> Find ID numbers automatically</p>
            <p className="mt-1 text-xs font-semibold text-night-muted">Reads the photo in your browser and marks Aadhaar, PAN and phone numbers. The first run downloads the reading model.</p>
            {scan.state === 'running' ? (
              <div className="mt-4">
                <div className="h-2 overflow-hidden rounded-full bg-white/10"><motion.div className="h-full rounded-full bg-glow-heat" animate={{ width: `${Math.max(5, scan.progress * 100)}%` }} /></div>
                <p className="mt-2 flex items-center gap-2 text-xs font-bold text-night-muted"><LoaderCircle size={13} className="animate-spin" /> Reading the photo on your device…</p>
              </div>
            ) : (
              <button type="button" onClick={autoFind} disabled={!img} className="mt-4 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-white/20 text-sm font-extrabold hover:bg-white/10 disabled:opacity-40">
                <ScanText size={15} /> {scan.state === 'done' ? 'Scan again' : 'Find them for me'}
              </button>
            )}
            {scan.state === 'done' && <p className="mt-2 text-xs font-bold text-glow-money">{scan.found ? `Found and blurred ${scan.found} number${scan.found > 1 ? 's' : ''}. Check the photo.` : 'No ID numbers found. You can still drag to blur anything.'}</p>}
            {scan.state === 'failed' && <p className="mt-2 text-xs font-bold text-[#E38B93]">Couldn't read the photo here. Drag over private details instead.</p>}
          </div>

          <div className="rounded-[24px] border border-night-line bg-night-2/80 p-5 backdrop-blur">
            <p className="num text-3xl font-extrabold">{boxes.length}</p>
            <p className="text-xs font-bold text-night-muted">area{boxes.length === 1 ? '' : 's'} will be blurred</p>
            <button type="button" onClick={() => proceed(true)} disabled={busy || !img} className="mt-4 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-glow-heat text-sm font-extrabold text-night disabled:opacity-50">
              {busy ? <LoaderCircle size={16} className="animate-spin" /> : <EyeOff size={16} />} {boxes.length ? 'Blur and analyse' : 'Analyse this photo'} <ArrowRight size={15} />
            </button>
            {boxes.length > 0 && (
              <button type="button" onClick={() => proceed(false)} disabled={busy} className="mt-2 w-full cursor-pointer text-center text-xs font-bold text-night-muted hover:text-white">Skip blurring</button>
            )}
          </div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, ease: EASE }} className="text-xs font-semibold text-night-muted">
            Clausewise also hides Aadhaar, PAN and phone numbers in the text it reads, so they never appear in your report, history or messages.
          </motion.p>
        </aside>
      </main>
    </motion.div>
  )
}
