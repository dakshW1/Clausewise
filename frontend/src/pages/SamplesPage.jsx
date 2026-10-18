import { motion } from 'framer-motion'
import { ArrowLeftRight, ArrowRight, Briefcase, FileUp, House, Landmark, PenTool, Scale } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EASE, Kicker, Reveal, Words } from '../components/motion-bits'
import { Logo } from '../components/ui'
import { api } from '../lib/api'
import { useStore } from '../lib/store'

export const DOC_ICONS = { rent: House, employment: Briefcase, loan: Landmark, freelance: PenTool, general: Scale }

export default function SamplesPage() {
  const { setJob } = useStore()
  const navigate = useNavigate()
  const [samples, setSamples] = useState(null)
  const [previews, setPreviews] = useState({})
  const fileRef = useRef(null)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    api.samples().then((list) => {
      setSamples(list)
      list.forEach((s) => api.sampleText(s.id).then((d) => setPreviews((p) => ({ ...p, [s.id]: d.text }))).catch(() => {}))
    }).catch(() => setSamples([]))
  }, [])

  const start = (job) => { setJob(job); navigate('/scan') }

  return (
    <motion.div key="samples" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, filter: 'blur(8px)' }} className="grain relative min-h-screen bg-night text-night-text">
      <div className="pointer-events-none absolute -right-24 top-0 h-[28rem] w-[28rem] rounded-full bg-glow-heat/15 blur-[120px]" />
      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => e.target.files?.[0] && start({ file: e.target.files[0] })} />

      <header className="relative z-10 mx-auto flex h-18 max-w-[1400px] items-center justify-between px-5 sm:px-8">
        <Link to="/" aria-label="Clausewise home"><Logo dark /></Link>
        <Link to="/history" className="flex h-11 items-center rounded-full px-4 text-sm font-bold text-night-text/80 transition hover:text-white">Your history</Link>
      </header>

      <main className="relative z-10 mx-auto max-w-[1400px] px-5 pb-24 pt-10 sm:px-8">
        <Kicker n="··">Sample library</Kicker>
        <h1 className="max-w-[16ch] font-display text-[clamp(40px,7vw,104px)] font-extrabold leading-[0.92] tracking-[-0.045em]">
          <Words text="Pick a document." />
          <br />
          <span className="font-serif font-normal italic text-glow-heat"><Words text="Watch it get checked." delay={0.2} /></span>
        </h1>
        <Reveal delay={0.3} className="mt-6 max-w-[560px] text-[17px] font-medium leading-relaxed text-night-text/75">
          Four real-world documents with problems planted in them, each checked against its own rulebook: the Model Tenancy Act, Indian employment law, RBI lending rules and fair freelance practice.
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {(samples ?? Array.from({ length: 4 }, (_, i) => ({ id: `skeleton-${i}` }))).map((s, i) => (
            <SampleCard key={s.id} sample={s} preview={previews[s.id]} index={i} onPick={() => start({ sampleId: s.id })} />
          ))}
        </div>

        <motion.button
          type="button"
          onClick={() => fileRef.current?.click()}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="group mt-5 flex w-full cursor-pointer items-center gap-5 rounded-[28px] border-2 border-dashed border-white/15 p-6 text-left transition hover:border-glow-heat/60 hover:bg-white/[0.03]"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-glow-heat text-night"><FileUp size={24} /></span>
          <span className="flex-1">
            <span className="block text-lg font-extrabold">Check your own document</span>
            <span className="block text-sm font-semibold text-night-muted">Photograph a rent agreement, offer letter, loan or freelance contract. Clausewise works out the type and picks the right rulebook.</span>
          </span>
          <ArrowRight size={20} className="shrink-0 transition group-hover:translate-x-1" />
        </motion.button>
      </main>
    </motion.div>
  )
}

function SampleCard({ sample, preview, index, onPick }) {
  const Icon = DOC_ICONS[sample.type] || Scale
  const loading = !sample.title
  const lines = (preview || '').split('\n').filter(Boolean).slice(0, 9)
  return (
    <motion.button
      type="button"
      disabled={loading}
      onClick={onPick}
      initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.8, ease: EASE, delay: 0.35 + index * 0.1 }}
      whileHover="hover"
      className="group relative flex min-h-[300px] cursor-pointer overflow-hidden rounded-[28px] border border-night-line bg-night-2/80 p-6 text-left backdrop-blur-md transition hover:border-white/25"
    >
      <div className="relative z-10 flex max-w-[58%] flex-col">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-glow-heat"><Icon size={22} /></span>
        <span className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-night-muted">{sample.label || ' '}</span>
        <span className="mt-1 font-display text-[28px] font-extrabold leading-[1.02] tracking-[-0.03em]">{sample.title || ' '}</span>
        <span className="mt-2 text-sm font-semibold text-night-text/70">{sample.subtitle}</span>
        {sample.person && <span className="mt-1 text-xs font-bold text-night-muted">For {sample.person}</span>}
        {sample.teaser && (
          <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-[#E38B93]/15 px-3 py-1.5 text-xs font-extrabold text-[#E38B93]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#E38B93]" /> {sample.teaser}
          </span>
        )}
        <span className="mt-auto flex flex-wrap items-center gap-2 pt-5 text-xs font-bold text-night-muted">
          {sample.parties && (
            <span className="flex items-center gap-1.5 rounded-full border border-night-line px-3 py-1.5">
              {sample.parties.you} <ArrowLeftRight size={12} /> {sample.parties.them}
            </span>
          )}
          {sample.rules && <span className="num rounded-full border border-night-line px-3 py-1.5">{sample.rules} rules</span>}
        </span>
      </div>

      {/* A small stack of paper that fans out on hover. */}
      <div className="pointer-events-none absolute -bottom-6 right-4 h-[250px] w-[190px]" style={{ perspective: 900 }}>
        {[2, 1, 0].map((k) => (
          <motion.div
            key={k}
            variants={{ hover: { rotate: k === 0 ? -2 : k * 7, x: k * 22, y: -k * 6 } }}
            initial={{ rotate: k * 3, x: k * 6, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            className="paper-doc absolute inset-0 origin-bottom-left rounded-2xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            style={{ zIndex: 3 - k, opacity: 1 - k * 0.25 }}
          >
            {k === 0 && (
              <div className="space-y-1 font-serif text-[7.5px] leading-snug text-black/70">
                {lines.map((l, i) => <p key={i} className={i === 0 ? 'mb-1 text-center font-sans font-extrabold tracking-widest' : ''}>{l.slice(0, 140)}</p>)}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <span className="absolute right-5 top-5 z-10 flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-xs font-extrabold text-ink opacity-0 transition group-hover:opacity-100">
        Check it <ArrowRight size={14} />
      </span>
    </motion.button>
  )
}
