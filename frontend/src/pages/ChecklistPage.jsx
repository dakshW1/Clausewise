import { AnimatePresence, motion } from 'framer-motion'
import { Download, HeartHandshake, LoaderCircle, MessageCircle, Play, Share2, Square, Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import HelpCard from '../components/HelpCard'
import { EASE } from '../components/motion-bits'
import { api } from '../lib/api'
import { speak, stopSpeaking } from '../lib/speech'
import { useStore } from '../lib/store'
import { LANGUAGES } from '../lib/theme'
import { PageHead } from './ReportLayout'

const GROUPS = [
  { key: 'check', title: 'Check these things', hint: 'In the document itself' },
  { key: 'ask', title: 'Ask these questions', hint: 'Before you sign' },
  { key: 'bring', title: 'Keep these ready', hint: 'Documents and proofs' },
]
const lists = new Map()
const summaries = new Map()

export default function ChecklistPage() {
  const { analysis, lang, setLang } = useStore()
  const docKey = `${analysis.title}|${analysis.score}|${analysis.clauses.length}`
  const [list, setList] = useState(() => lists.get(docKey) ?? null)
  const [done, setDone] = useState(() => new Set())
  const [reading, setReading] = useState(false)

  useEffect(() => {
    if (lists.has(docKey)) return
    api.checklist(analysis).then((l) => { lists.set(docKey, l); setList(l) }).catch(() => setList({ check: [], ask: [], bring: [] }))
  }, [docKey, analysis])
  useEffect(() => stopSpeaking, [])

  const items = list ? GROUPS.flatMap((g) => (list[g.key] || []).map((text, i) => ({ id: `${g.key}-${i}`, text }))) : []
  const progress = items.length ? done.size / items.length : 0
  const toggle = (id) => setDone((d) => { const n = new Set(d); n.has(id) ? n.delete(id) : n.add(id); return n })

  async function readAloud() {
    if (reading) { stopSpeaking(); setReading(false); return }
    const script = GROUPS.map((g) => `${g.title}. ${(list[g.key] || []).join('. ')}`).join('. ')
    setReading(true)
    const v = await api.speak(script, lang).catch(() => ({ text: script, language_code: 'en-IN' }))
    speak(v.text, v.language_code, v.audio_base64, { onEnd: () => setReading(false) })
  }

  return (
    <>
      <PageHead kicker={['08', 'Checklist']} title="Before you sign," accent="tick these off." sub="Three things to check, two questions to ask, and what to keep ready, taken from the issues found in your document." />
      <div className="grid items-start gap-5 lg:grid-cols-12 [&>*]:min-w-0">
        <section className="rounded-[24px] bg-surface p-5 shadow-[0_1px_2px_rgba(20,20,20,0.05)] sm:p-6 lg:col-span-7">
          <div className="mb-5 flex flex-wrap items-center gap-4">
            <div className="flex-1">
              <div className="mb-1.5 flex justify-between text-xs font-extrabold text-muted">
                <span>{done.size} of {items.length || '–'} done</span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-paper">
                <motion.div className="h-full rounded-full bg-money" animate={{ width: `${progress * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
              </div>
            </div>
            <button type="button" disabled={!list} onClick={readAloud} className="flex h-11 cursor-pointer items-center gap-2 rounded-full bg-ink px-5 text-sm font-extrabold text-white disabled:opacity-40">
              {reading ? <><Square size={14} fill="currentColor" /> Stop</> : <><Volume2 size={16} /> Read it to me</>}
            </button>
          </div>

          {!list && <div className="flex items-center gap-2 py-10 text-sm font-bold text-muted"><LoaderCircle size={16} className="animate-spin" /> Writing your checklist…</div>}
          {list && GROUPS.map((g, gi) => (
            <div key={g.key} className="mb-6 last:mb-0">
              <p className="mb-2 flex items-baseline gap-2"><span className="text-[15px] font-extrabold">{g.title}</span><span className="text-xs font-bold text-muted">{g.hint}</span></p>
              <div className="flex flex-col gap-2">
                {(list[g.key] || []).map((text, i) => {
                  const id = `${g.key}-${i}`
                  const on = done.has(id)
                  return (
                    <motion.button
                      type="button"
                      key={id}
                      onClick={() => toggle(id)}
                      initial={{ opacity: 0, x: -14 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.45, ease: EASE, delay: gi * 0.1 + i * 0.06 }}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 text-left transition ${on ? 'border-money/30 bg-money-soft' : 'border-line hover:border-ink/25'}`}
                    >
                      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition ${on ? 'border-money bg-money' : 'border-line'}`}>
                        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                          <motion.path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" initial={false} animate={{ pathLength: on ? 1 : 0 }} transition={{ duration: 0.3 }} />
                        </svg>
                      </span>
                      <span className={`text-sm font-semibold leading-snug transition ${on ? 'text-muted line-through decoration-money/50' : 'text-ink'}`}>{text}</span>
                    </motion.button>
                  )
                })}
              </div>
            </div>
          ))}
        </section>

        <div className="flex flex-col gap-5 lg:col-span-5">
          <FamilyShare analysis={analysis} lang={lang} setLang={setLang} />
          <HelpCard compact />
        </div>
      </div>
    </>
  )
}

// A short spoken summary to send to someone you trust for a second opinion.
function FamilyShare({ analysis, lang, setLang }) {
  const key = `${analysis.title}|${analysis.score}|${analysis.clauses.length}|${lang}`
  const [data, setData] = useState(() => summaries.get(key) ?? null)
  const [busy, setBusy] = useState(false)
  const [playing, setPlaying] = useState(false)

  useEffect(() => { setData(summaries.get(key) ?? null) }, [key])

  async function make() {
    setBusy(true)
    try {
      const d = await api.summary(analysis, lang)
      summaries.set(key, d)
      setData(d)
      play(d)
    } finally {
      setBusy(false)
    }
  }

  function play(d = data) {
    if (playing) { stopSpeaking(); setPlaying(false); return }
    speak(d.summary, d.language_code, d.audio_base64, { onStart: () => setPlaying(true), onEnd: () => setPlaying(false) })
  }

  const audioFile = () => {
    const bytes = Uint8Array.from(atob(data.audio_base64), (c) => c.charCodeAt(0))
    return new File([bytes], 'clausewise-summary.wav', { type: 'audio/wav' })
  }
  function download() {
    const url = URL.createObjectURL(audioFile())
    Object.assign(document.createElement('a'), { href: url, download: 'clausewise-summary.wav' }).click()
    URL.revokeObjectURL(url)
  }
  async function share() {
    const file = data.audio_base64 ? audioFile() : null
    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text: data.summary }).catch(() => {})
    } else {
      window.open('https://wa.me/?text=' + encodeURIComponent(data.summary), '_blank', 'noreferrer')
    }
  }

  return (
    <section className="relative overflow-hidden rounded-[24px] bg-night p-5 text-night-text sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-glow-heat/10 blur-[70px]" />
      <div className="relative">
        <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-night-muted"><HeartHandshake size={14} /> Get a second opinion</span>
        <h2 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.03em]">Send family a 30-second summary.</h2>
        <div className="mt-3 flex flex-wrap gap-1">
          {LANGUAGES.map((l) => (
            <button type="button" key={l.code} onClick={() => setLang(l.code)} className="relative cursor-pointer rounded-full px-3 py-1 text-xs font-extrabold">
              {lang === l.code && <motion.span layoutId="share-lang" className="absolute inset-0 rounded-full bg-white" />}
              <span className={`relative ${lang === l.code ? 'text-ink' : 'text-night-muted'}`}>{l.native}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {data ? (
            <motion.div key="ready" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4">
              <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
                <button type="button" onClick={() => play()} className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-glow-heat text-night" aria-label={playing ? 'Stop' : 'Play summary'}>
                  {playing ? <Square size={16} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                </button>
                <span className="flex h-10 flex-1 items-center gap-[3px]" aria-hidden="true">
                  {Array.from({ length: 36 }, (_, i) => (
                    <motion.span key={i} className="w-[3px] flex-1 rounded-full bg-night-muted" animate={playing ? { height: [6, 8 + ((i * 13) % 26), 6] } : { height: 6 + ((i * 7) % 18) }} transition={playing ? { duration: 0.8, repeat: Infinity, delay: (i % 6) * 0.08 } : { duration: 0.3 }} />
                  ))}
                </span>
              </div>
              <p className="mt-3 text-sm font-medium leading-relaxed text-night-text/85">{data.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={share} className="flex h-10 cursor-pointer items-center gap-2 rounded-full bg-white px-4 text-xs font-extrabold text-ink">
                  {data.audio_base64 ? <Share2 size={14} /> : <MessageCircle size={14} />} Send to family
                </button>
                {data.audio_base64 && (
                  <button type="button" onClick={download} className="flex h-10 cursor-pointer items-center gap-2 rounded-full border border-night-line px-4 text-xs font-extrabold"><Download size={14} /> Save audio</button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.button key="make" type="button" onClick={make} disabled={busy} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-glow-heat text-sm font-extrabold text-night disabled:opacity-70">
              {busy ? <><LoaderCircle size={16} className="animate-spin" /> Recording the summary…</> : <><Volume2 size={16} /> Make the voice summary</>}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
