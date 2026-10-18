import { motion } from 'framer-motion'
import { CircleCheck, LoaderCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AGENTS, PIPELINE } from '../lib/agents'
import { api } from '../lib/api'
import { useStore } from '../lib/store'
import { EASE, Words } from './motion-bits'

const MIN_SCAN_MS = 3800
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// Runs the analysis for the pending job while a scan beam sweeps the page and the pipeline agents hand work along.
export default function Scanning() {
  const { job, setAnalysis, clearFocus } = useStore()
  const navigate = useNavigate()
  const file = job?.file ?? null
  const [stage, setStage] = useState(0)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)
  const [sampleText, setSampleText] = useState('')
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  useEffect(() => {
    if (!job) {
      navigate('/', { replace: true })
      return
    }
    window.scrollTo(0, 0)
    let cancelled = false
    if (!file) api.sampleText(job.sampleId || 'rent').then((d) => !cancelled && setSampleText(d.text)).catch(() => {})
    Promise.all([api.analyze(file, job.sampleId), wait(MIN_SCAN_MS)])
      .then(async ([result]) => {
        if (cancelled) return
        setAnalysis(result)
        clearFocus()
        setDone(true)
        await wait(700)
        // Leave the job in place: this screen is still mounted during its exit animation,
        // and clearing the job would trigger the "no job, go home" redirect above.
        if (!cancelled) navigate('/report', { replace: true })
      })
      .catch((e) => !cancelled && setError(e.message))
    return () => { cancelled = true }
    // The job is the only input; re-running on other changes would start a second analysis.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job])

  useEffect(() => {
    const timers = [1100, 2200, 3100].map((t, i) => setTimeout(() => setStage((s) => Math.max(s, i + 1)), t))
    return () => timers.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    if (done && stage >= 3) setStage(4)
  }, [done, stage])

  const lines = (sampleText || '').split('\n').filter(Boolean).slice(0, 16)

  return (
    <motion.main
      key="scan"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(8px)' }}
      className="grain relative min-h-screen bg-night text-night-text"
    >
      <div className="pointer-events-none absolute -right-20 top-10 h-96 w-96 rounded-full bg-glow-heat/15 blur-[110px]" />
      <div className="relative mx-auto grid min-h-screen max-w-[1300px] items-center gap-14 px-5 py-12 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative mx-auto w-full max-w-[400px]" style={{ perspective: 1400 }}>
          <motion.div
            initial={{ rotateY: -30, rotateX: 14, y: 60, opacity: 0 }}
            animate={{ rotateY: -10, rotateX: 6, y: 0, opacity: 1 }}
            transition={{ duration: 1.1, ease: EASE }}
            className="paper-doc relative h-[520px] overflow-hidden rounded-[28px] p-7 shadow-[0_40px_120px_rgba(0,0,0,0.6)]"
          >
            {preview ? (
              <img src={preview} alt="Your document" className="h-full w-full rounded-xl object-cover" />
            ) : (
              <div className="space-y-2 font-serif text-[13px] leading-snug">
                {lines.map((l, i) => (
                  <p key={i} className={i === 0 ? 'mb-3 text-center font-sans text-xs font-extrabold tracking-[0.3em]' : ''}>{l}</p>
                ))}
              </div>
            )}
            <motion.div
              className="absolute inset-x-0 h-28"
              style={{ background: 'linear-gradient(180deg, transparent, rgba(216,178,106,0.28), transparent)' }}
              animate={{ top: ['-15%', '100%'] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', repeatType: 'reverse' }}
            >
              <div className="absolute inset-x-0 top-1/2 h-[2px] bg-glow-heat shadow-[0_0_20px_#D8B26A]" />
            </motion.div>
          </motion.div>
        </div>

        <div>
          <div className="mb-6 flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.2em] text-night-muted">
            <span className="num text-glow-heat">··</span><span className="h-px w-10 bg-white/25" /> Reading your document
          </div>
          <h2 className="font-display text-[clamp(38px,6vw,84px)] font-extrabold leading-[0.92] tracking-[-0.045em]">
            <Words text="Four checks." />
            <br />
            <span className="font-serif font-normal italic text-glow-heat"><Words text="One verdict." delay={0.2} /></span>
          </h2>

          <ol className="mt-10 flex max-w-[520px] flex-col gap-2.5">
            {PIPELINE.map((name, i) => {
              const a = AGENTS[name]
              const state = stage > i ? 'done' : stage === i ? 'working' : 'waiting'
              return (
                <motion.li
                  key={name}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: state === 'waiting' ? 0.4 : 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08, ease: EASE, duration: 0.6 }}
                  className={`flex items-center gap-4 rounded-2xl border px-3 py-3 backdrop-blur ${state === 'working' ? 'border-white/25 bg-white/10' : 'border-night-line bg-night-2/70'}`}
                >
                  <span className="num w-6 text-center text-sm font-extrabold text-night-muted">{String(i + 1).padStart(2, '0')}</span>
                  <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `${a.color}26`, color: a.color }}>
                    <a.icon size={20} />
                    {state === 'working' && <span className="pulse-ring absolute inset-0 rounded-xl border-2" style={{ borderColor: a.color }} />}
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="text-[15px] font-extrabold">{name}</span>
                    <span className="text-xs font-bold text-night-muted">{state === 'working' ? a.working : a.role}</span>
                  </span>
                  {state === 'done' && <CircleCheck className="text-glow-money" size={20} />}
                  {state === 'working' && <LoaderCircle className="animate-spin text-night-muted" size={20} />}
                </motion.li>
              )
            })}
          </ol>
          {error && (
            <div className="mt-6 flex max-w-[520px] items-center justify-between gap-3 rounded-2xl border border-danger/40 bg-danger/15 px-4 py-3 text-sm font-bold">
              Could not analyse the document: {error}
              <button type="button" onClick={() => navigate('/')} className="shrink-0 cursor-pointer rounded-full bg-white px-4 py-1.5 text-xs font-extrabold text-ink">Go back</button>
            </div>
          )}
        </div>
      </div>
    </motion.main>
  )
}
