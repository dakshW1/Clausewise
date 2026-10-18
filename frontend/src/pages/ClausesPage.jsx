import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, LoaderCircle, Mic, RefreshCw, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ClauseList from '../components/ClauseList'
import { CountTo, EASE } from '../components/motion-bits'
import { Chip } from '../components/ui'
import { api } from '../lib/api'
import { browserRecognition } from '../lib/speech'
import { useStore } from '../lib/store'
import { SEVERITY } from '../lib/theme'
import { PageHead } from './ReportLayout'

const LEVELS = [
  { key: 'simple', label: 'Simple', hint: 'A few everyday words' },
  { key: 'normal', label: 'Normal', hint: 'One plain sentence' },
  { key: 'detailed', label: 'Detailed', hint: 'What it means and what it risks' },
]
// Rewrites already fetched this session, keyed by document and level.
const rewrites = new Map()

// The original document stays pinned on the left and follows along as you scroll the plain-language cards.
export default function ClausesPage() {
  const { analysis, setAnalysis, active, focus } = useStore()
  const [spy, setSpy] = useState(analysis.clauses[0]?.id)
  const [level, setLevel] = useState('normal')
  const [explanations, setExplanations] = useState(null)
  const [loadingLevel, setLoadingLevel] = useState(null)
  const [levelNote, setLevelNote] = useState(null)
  const [correcting, setCorrecting] = useState(null)
  const [result, setResult] = useState(null)
  const counts = analysis.counts
  const pane = useRef(null)

  // Keep the paragraph being read in view inside the pinned document (scrolling only that pane, not the page).
  useEffect(() => {
    const box = pane.current
    const el = box?.querySelector(`[data-clause="${spy}"]`)
    if (box && el) box.scrollTo({ top: el.offsetTop - box.clientHeight / 3, behavior: 'smooth' })
  }, [spy])

  async function pickLevel(next) {
    setLevel(next)
    setLevelNote(null)
    if (next === 'normal') { setExplanations(null); return }
    const key = `${analysis.title}|${analysis.score}|${analysis.clauses.length}|${next}`
    if (rewrites.has(key)) { setExplanations(rewrites.get(key)); return }
    setLoadingLevel(next)
    try {
      const r = await api.explain(analysis, next)
      if (r.explanations) { rewrites.set(key, r.explanations); setExplanations(r.explanations) }
      else { setLevelNote(r.notice); setLevel('normal'); setExplanations(null) }
    } catch (e) {
      setLevelNote(e.message); setLevel('normal')
    } finally {
      setLoadingLevel(null)
    }
  }

  const toolbar = (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-paper p-2">
      <span className="pl-2 text-xs font-extrabold uppercase tracking-[0.16em] text-muted">Explain it</span>
      <div className="flex rounded-full bg-surface p-1 text-xs font-extrabold">
        {LEVELS.map((l) => (
          <button type="button" key={l.key} onClick={() => pickLevel(l.key)} title={l.hint} className="relative flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5">
            {level === l.key && <motion.span layoutId="explain-level" className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
            {loadingLevel === l.key && <LoaderCircle size={12} className="relative animate-spin text-white" />}
            <span className={`relative ${level === l.key ? 'text-white' : 'text-muted'}`}>{l.label}</span>
          </button>
        ))}
      </div>
      <span className="text-xs font-semibold text-muted">{levelNote || LEVELS.find((l) => l.key === level).hint}</span>
    </div>
  )

  return (
    <>
      <PageHead
        kicker={['02', 'Clauses']}
        title="Every clause,"
        accent="in plain words."
        sub={`${counts.red} unfair, ${counts.amber} unusual, ${counts.green} fair, and ${counts.missing} important clauses missing.`}
      />
      <AnimatePresence>{result && <RecheckResult result={result} onClose={() => setResult(null)} />}</AnimatePresence>
      <div className="grid gap-5 lg:grid-cols-12 [&>*]:min-w-0">
        <aside className="hidden lg:col-span-5 lg:block">
          <div className="sticky top-[136px] flex gap-3">
            <DocumentMap clauses={analysis.clauses} spy={spy} onPick={(c) => focus([c.id], c.rule_id ? [c.rule_id] : [])} />
            <div ref={pane} className="paper-doc scrollbar-thin relative max-h-[calc(100vh-170px)] flex-1 overflow-y-auto rounded-[24px] p-6 shadow-[0_1px_2px_rgba(20,20,20,0.05)]">
              <p className="mb-4 text-center font-sans text-[11px] font-extrabold uppercase tracking-[0.3em] text-black/45">{analysis.title}</p>
              <div className="flex flex-col gap-1 font-serif text-[15px] leading-snug">
                {analysis.clauses.map((c) => {
                  const s = SEVERITY[c.severity]
                  const on = spy === c.id
                  return (
                    <button
                      type="button"
                      key={c.id}
                      data-clause={c.id}
                      onClick={() => focus([c.id], c.rule_id ? [c.rule_id] : [])}
                      className="relative cursor-pointer rounded-lg px-3 py-2 text-left transition"
                    >
                      {on && <motion.span layoutId="doc-spy" className="absolute inset-0 rounded-lg" style={{ background: s.soft }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} />}
                      {on && <motion.span layoutId="doc-spy-bar" className="absolute inset-y-1 left-0 w-1 rounded-full" style={{ background: s.color }} />}
                      <span className="relative">
                        <b className="font-sans text-xs font-extrabold">{c.number}.</b>{' '}
                        <span style={c.severity === 'green' ? undefined : { textDecoration: 'underline', textDecorationColor: s.color, textDecorationThickness: 2, textUnderlineOffset: 3 }}>
                          {c.text}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </aside>
        <div className="lg:col-span-7">
          <ClauseList analysis={analysis} active={active} onSpy={setSpy} explanations={explanations} onCorrect={setCorrecting} toolbar={toolbar} />
        </div>
      </div>
      <AnimatePresence>
        {correcting && (
          <CorrectDrawer
            clause={correcting}
            analysis={analysis}
            onClose={() => setCorrecting(null)}
            onDone={(r) => { setAnalysis(r.analysis); setResult(r); setCorrecting(null); setExplanations(null); setLevel('normal'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// Fix a misread clause by typing or dictating, then run the fairness check again.
function CorrectDrawer({ clause, analysis, onClose, onDone }) {
  const [text, setText] = useState(clause.text)
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState(null)
  const Recognition = browserRecognition()

  function dictate() {
    if (!Recognition) return
    const r = new Recognition()
    r.lang = 'en-IN'
    r.interimResults = false
    r.onresult = (e) => setText(e.results[0][0].transcript)
    r.onend = () => setListening(false)
    r.onerror = () => setListening(false)
    setListening(true)
    r.start()
  }

  async function recheck() {
    setBusy(true)
    setError(null)
    try {
      onDone(await api.recheck(analysis, { [clause.id]: text }))
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex justify-end bg-night/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={busy ? undefined : onClose}>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-[480px] flex-col gap-4 overflow-y-auto bg-paper p-6"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted">Correct clause {clause.number}</span>
          <button type="button" onClick={onClose} disabled={busy} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full hover:bg-line" aria-label="Close"><X size={17} /></button>
        </div>
        <h2 className="font-display text-3xl font-extrabold tracking-[-0.03em]">{clause.title}</h2>
        <p className="text-sm font-semibold text-ink-2">If the photo was read wrongly, type or say what the clause really says. Clausewise will run the whole fairness check again.</p>
        <div className="paper-doc rounded-xl p-3.5 font-serif text-[15px] leading-snug">
          <span className="mb-1 block font-sans text-[10px] font-extrabold uppercase tracking-[0.16em] text-black/45">Clausewise read</span>
          {clause.text}
        </div>
        <label className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted" htmlFor="corrected">It actually says</label>
        <textarea id="corrected" value={text} onChange={(e) => setText(e.target.value)} rows={6} className="w-full rounded-xl border border-line bg-surface p-3.5 text-[15px] font-medium leading-snug outline-none focus:border-ink/40" />
        <div className="flex flex-wrap gap-2">
          {Recognition && (
            <button type="button" onClick={dictate} disabled={listening || busy} className="flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-extrabold disabled:opacity-60">
              <Mic size={15} className={listening ? 'animate-pulse text-danger' : ''} /> {listening ? 'Listening…' : 'Say it instead'}
            </button>
          )}
          <button type="button" onClick={recheck} disabled={busy || !text.trim() || text.trim() === clause.text} className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-extrabold text-white disabled:opacity-40">
            {busy ? <><LoaderCircle size={16} className="animate-spin" /> Rechecking every clause…</> : <><RefreshCw size={15} /> Recheck the document</>}
          </button>
        </div>
        {error && <p className="text-sm font-bold text-danger">{error}</p>}
      </motion.div>
    </motion.div>
  )
}

function RecheckResult({ result, onClose }) {
  const up = result.score_after >= result.score_before
  return (
    <motion.div
      initial={{ opacity: 0, y: -16, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="relative mb-5 overflow-hidden rounded-[24px] bg-night p-5 text-night-text sm:p-6"
    >
      <button type="button" onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full hover:bg-white/10" aria-label="Dismiss"><X size={15} /></button>
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-night-muted">Rechecked with your correction</p>
      <div className="mt-2 flex flex-wrap items-center gap-6">
        <span className="num text-[44px] font-extrabold leading-none tracking-[-0.03em]">
          <span className="text-night-muted">{result.score_before}</span>
          <ArrowRight size={26} className="mx-2 inline" />
          <span className={up ? 'text-glow-money' : 'text-[#E38B93]'}><CountTo from={result.score_before} to={result.score_after} onMount duration={1.2} /></span>
        </span>
        <div className="flex flex-col gap-1.5">
          {result.changes.map((c, i) => (
            <motion.div key={c.clause_id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="flex flex-wrap items-center gap-2 text-sm font-bold">
              Clause {c.number} · {c.title}
              {c.before && <Chip color={SEVERITY[c.before].text} soft={SEVERITY[c.before].soft}>{SEVERITY[c.before].short}</Chip>}
              <ArrowRight size={13} />
              <Chip color={SEVERITY[c.after].text} soft={SEVERITY[c.after].soft}>{SEVERITY[c.after].short}</Chip>
              {c.corrected && <span className="text-xs font-semibold text-night-muted">(you corrected this)</span>}
            </motion.div>
          ))}
          {result.changes.length === 0 && <span className="text-sm font-semibold text-night-text/70">No verdicts changed.</span>}
        </div>
      </div>
    </motion.div>
  )
}

// A vertical strip, one segment per clause, coloured by verdict: the whole agreement at a glance.
function DocumentMap({ clauses, spy, onPick }) {
  return (
    <div className="flex w-3 flex-col gap-1 py-2" aria-label="Document map">
      {clauses.map((c, i) => (
        <motion.button
          type="button"
          key={c.id}
          title={`Clause ${c.number}: ${c.title}`}
          onClick={() => onPick(c)}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1, opacity: spy === c.id ? 1 : 0.45 }}
          transition={{ delay: 0.2 + i * 0.04 }}
          className="w-full flex-1 origin-top cursor-pointer rounded-full"
          style={{ background: SEVERITY[c.severity].color, minHeight: 18 }}
        />
      ))}
    </div>
  )
}
