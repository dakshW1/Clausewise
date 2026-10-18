import { motion } from 'framer-motion'
import { ArrowRight, Briefcase, FileUp, House, KeyRound, Landmark, PenTool, RefreshCw, ScanLine, Scale, Sun, SquareDashed, FileText } from 'lucide-react'
import { useRef } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { EASE, Kicker, Reveal, Words } from '../components/motion-bits'
import { Logo } from '../components/ui'
import { useStore } from '../lib/store'

const CAN_CHECK = [
  [House, 'Rent agreements'],
  [Briefcase, 'Job offers'],
  [Landmark, 'Loan agreements'],
  [PenTool, 'Freelance contracts'],
  [Scale, 'Other contracts'],
]

const PHOTO_TIPS = [
  [SquareDashed, 'Lay the page flat and fit all four corners in the frame'],
  [Sun, 'Use daylight or a bright room, with no shadow over the text'],
  [ScanLine, 'Hold the phone straight above the page and keep it still'],
  [FileText, 'If you have the agreement as a PDF, upload that instead'],
]

const COPY = {
  not_agreement: (kind) => ({
    stamp: 'Not an agreement',
    title: 'This isn’t an agreement.',
    accent: kind ? `It looks like ${/^[aeiou]/i.test(kind) ? 'an' : 'a'} ${kind}.` : 'Try a different document.',
    text: 'Clausewise checks documents that someone signs, like a lease or an offer letter, against the law. Nothing was saved from this upload.',
  }),
  unreadable: () => ({
    stamp: 'Too blurry',
    title: 'We couldn’t read it clearly.',
    accent: 'Let’s try a sharper photo.',
    text: 'Parts of the page were blurred, dark or cut off, so Clausewise couldn’t check it fairly. Nothing was saved from this upload.',
  }),
  failed: () => ({
    stamp: 'No response',
    title: 'Something went wrong.',
    accent: 'Your document is safe.',
    text: 'The AI didn’t respond in time, so the document wasn’t checked or saved. This usually works on a second try.',
  }),
  no_key: () => ({
    stamp: 'Offline',
    title: 'Live checking is switched off.',
    accent: 'The samples still work.',
    text: 'This copy of Clausewise has no Gemini API key, so it can’t read new documents. Add one to backend/.env, or explore the sample documents.',
  }),
}

// Shown instead of a report when an upload isn't an agreement, can't be read, or couldn't be checked.
export default function UnsupportedPage() {
  const { state } = useLocation()
  const { setJob } = useStore()
  const navigate = useNavigate()
  const fileRef = useRef(null)
  if (!state?.error) return <Navigate to="/" replace />

  const kind = COPY[state.error] ? state.error : 'failed'
  const copy = COPY[kind](state.document_kind)
  const tryFile = (file) => { setJob({ file, caseId: state.caseId ?? undefined }); navigate('/prepare') }

  return (
    <motion.div key="unsupported" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, filter: 'blur(8px)' }} className="grain relative min-h-screen bg-night text-night-text">
      <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => e.target.files?.[0] && tryFile(e.target.files[0])} />
      <div className="pointer-events-none absolute -right-24 top-0 h-[28rem] w-[28rem] rounded-full bg-[#E38B93]/10 blur-[120px]" />
      <header className="relative z-10 mx-auto flex h-18 max-w-[1240px] items-center justify-between px-4 sm:px-6">
        <Link to="/" aria-label="Clausewise home"><Logo dark /></Link>
        <Link to="/samples" className="flex h-11 items-center rounded-full px-4 text-sm font-bold text-night-text/80 transition hover:text-white">Sample documents</Link>
      </header>

      <main className="relative z-10 mx-auto grid max-w-[1240px] items-center gap-12 px-4 pb-20 pt-8 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <Kicker n="!">Can’t check this one</Kicker>
          <h1 className="font-display text-[clamp(38px,6vw,84px)] font-extrabold leading-[0.92] tracking-[-0.045em]">
            <Words text={copy.title} />
            <br />
            <span className="font-serif font-normal italic text-glow-heat"><Words text={copy.accent} delay={0.25} /></span>
          </h1>
          <Reveal delay={0.4} className="mt-6 max-w-[520px] text-[17px] font-medium leading-relaxed text-night-text/75">{copy.text}</Reveal>

          <Reveal delay={0.55} className="mt-8 flex flex-wrap gap-3">
            {kind === 'failed' ? (
              <button type="button" onClick={() => navigate('/scan')} className="flex h-13 cursor-pointer items-center gap-2 rounded-full bg-glow-heat px-7 text-[15px] font-extrabold text-night hover:brightness-110">
                <RefreshCw size={17} /> Try again
              </button>
            ) : kind !== 'no_key' && (
              <button type="button" onClick={() => fileRef.current?.click()} className="flex h-13 cursor-pointer items-center gap-2 rounded-full bg-glow-heat px-7 text-[15px] font-extrabold text-night hover:brightness-110">
                <FileUp size={17} /> {kind === 'unreadable' ? 'Upload a clearer photo or PDF' : 'Upload a different document'}
              </button>
            )}
            <Link to="/samples" className="flex h-13 items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 text-[15px] font-bold backdrop-blur hover:bg-white/10">
              Try a sample <ArrowRight size={16} />
            </Link>
          </Reveal>

          <Reveal delay={0.7} className="mt-10">
            {kind === 'unreadable' ? (
              <div className="grid max-w-[560px] gap-2 sm:grid-cols-2">
                {PHOTO_TIPS.map(([Icon, tip]) => (
                  <div key={tip} className="flex items-start gap-3 rounded-2xl border border-night-line bg-night-2/70 p-3.5">
                    <Icon size={18} className="mt-0.5 shrink-0 text-glow-heat" />
                    <span className="text-[13px] font-semibold leading-snug text-night-text/85">{tip}</span>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-night-muted">{kind === 'no_key' ? 'Samples you can open' : 'Clausewise can check'}</p>
                <div className="flex flex-wrap gap-2">
                  {CAN_CHECK.map(([Icon, label]) => (
                    <span key={label} className="flex items-center gap-2 rounded-full border border-night-line bg-night-2/70 px-3.5 py-2 text-sm font-bold"><Icon size={15} className="text-glow-heat" /> {label}</span>
                  ))}
                </div>
              </>
            )}
          </Reveal>
        </div>

        <StampedPage stamp={copy.stamp} label={state.document_kind} icon={kind === 'no_key' ? KeyRound : null} />
      </main>
    </motion.div>
  )
}

// A page of paper (labelled with what we think it is) that gets stamped with the reason.
function StampedPage({ stamp, label, icon: Icon }) {
  return (
    <div className="relative mx-auto w-full max-w-[380px]" style={{ perspective: 1200 }}>
      <motion.div
        initial={{ rotateY: -25, rotateX: 10, y: 50, opacity: 0 }}
        animate={{ rotateY: -8, rotateX: 4, y: 0, opacity: 1 }}
        transition={{ duration: 1, ease: EASE }}
        className="paper-doc relative h-[460px] overflow-hidden rounded-[28px] p-8 shadow-[0_40px_120px_rgba(0,0,0,0.6)]"
      >
        {label && <p className="mb-5 text-center font-sans text-[11px] font-extrabold uppercase tracking-[0.3em] text-black/45">{label}</p>}
        <div className="space-y-3">
          {[90, 72, 84, 60, 88, 52, 76, 66, 80, 45].map((w, i) => (
            <motion.div key={i} className="h-2.5 rounded-full bg-black/10" style={{ width: `${w}%` }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.3 + i * 0.05, duration: 0.5, ease: EASE }} />
          ))}
        </div>
        {Icon && <Icon size={64} className="absolute bottom-10 left-1/2 -translate-x-1/2 text-black/15" />}
        <motion.div
          initial={{ scale: 2.6, opacity: 0, rotate: -4 }}
          animate={{ scale: 1, opacity: 1, rotate: -12 }}
          transition={{ delay: 1.1, type: 'spring', stiffness: 320, damping: 14 }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl border-[5px] border-[#9A2E3A] px-5 py-2 font-display text-[30px] font-extrabold uppercase tracking-[0.04em] text-[#9A2E3A]"
          style={{ mixBlendMode: 'multiply' }}
        >
          {stamp}
        </motion.div>
      </motion.div>
    </div>
  )
}
