import { AnimatePresence, motion, useScroll } from 'framer-motion'
import { ArrowLeft, ArrowRight, CircleCheckBig, CircleX, FileCheck, FileText, FileUp, Flag, MessageSquareReply, Send, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CountTo, EASE, Words } from '../components/motion-bits'
import Scales from '../components/Scales'
import { Logo } from '../components/ui'
import { api } from '../lib/api'
import { useStore } from '../lib/store'
import { scaleAngle, SEVERITY } from '../lib/theme'
import { OUTCOME, STATUS, timeAgo } from './HistoryPage'
import { DOC_ICONS } from './SamplesPage'

export default function CasePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { setAnalysis, setJob, clearFocus } = useStore()
  const [c, setCase] = useState(null)
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    api.getCase(id).then(setCase).catch(() => setError('This case could not be found.'))
  }, [id])

  if (error) return <div className="flex min-h-screen items-center justify-center bg-paper font-bold text-muted">{error} <Link to="/history" className="ml-2 underline">Back to history</Link></div>
  if (!c) return <div className="min-h-screen bg-paper" />

  const Icon = DOC_ICONS[c.doc_type] || DOC_ICONS.general
  const update = (p) => p.then(setCase).catch(() => {})
  const openReport = () => {
    setAnalysis({ ...c.latest_analysis, case_id: c.id })
    clearFocus()
    navigate('/report')
  }
  const uploadRevision = (file) => {
    setJob({ file, caseId: c.id })
    navigate('/scan')
  }
  const remove = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    await api.deleteCase(c.id)
    navigate('/history')
  }

  return (
    <motion.div key={`case-${id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, filter: 'blur(8px)' }} className="min-h-screen bg-paper">
      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => e.target.files?.[0] && uploadRevision(e.target.files[0])} />
      <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="Clausewise home"><Logo /></Link>
          <Link to="/history" className="ml-auto flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-extrabold hover:border-ink/30"><ArrowLeft size={15} /> All cases</Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-8 sm:px-6">
        <div className="flex flex-wrap items-end gap-5">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-bold text-muted"><Icon size={15} /> {c.doc_label} · started {timeAgo(c.created_at)}{c.example ? ' · example case' : ''}</p>
            <h1 className="mt-1 font-display text-[clamp(28px,4vw,48px)] font-extrabold leading-[1.05] tracking-[-0.04em]"><Words text={c.title} /></h1>
          </div>
          <StatusPicker value={c.status} onChange={(s) => update(api.setStatus(c.id, s))} />
        </div>

        <BeforeAfter c={c} onUpload={() => fileRef.current?.click()} />

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={openReport} className="flex h-11 cursor-pointer items-center gap-2 rounded-full bg-ink px-5 text-sm font-extrabold text-white hover:bg-ink-2"><FileText size={16} /> Open the latest report</button>
          <button type="button" onClick={() => fileRef.current?.click()} className="flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-extrabold hover:border-ink/30"><FileUp size={16} /> Upload revised version</button>
          {!c.example && (
            <button type="button" onClick={remove} onBlur={() => setConfirmDelete(false)} className={`flex h-11 cursor-pointer items-center gap-2 rounded-full px-5 text-sm font-extrabold transition ${confirmDelete ? 'bg-danger text-white' : 'text-muted hover:text-danger'}`}>
              <Trash2 size={16} /> {confirmDelete ? 'Tap again to delete' : 'Delete case'}
            </button>
          )}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-12">
          <ClauseTracker c={c} onSet={(clauseId, status, note) => update(api.setOutcome(c.id, clauseId, status, note))} />
          <NegotiationTimeline c={c} onLog={(kind, text) => update(api.addEvent(c.id, kind, text))} />
        </div>
      </main>
    </motion.div>
  )
}

function StatusPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-full bg-surface p-1 text-xs font-extrabold shadow-[0_1px_2px_rgba(18,20,31,0.05)]">
      {Object.entries(STATUS).map(([k, s]) => (
        <button type="button" key={k} onClick={() => k !== value && onChange(k)} className="relative cursor-pointer rounded-full px-3.5 py-2">
          {value === k && <motion.span layoutId="case-status" className="absolute inset-0 rounded-full" style={{ background: s.soft }} transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
          <span className="relative" style={{ color: value === k ? s.color : '#6B6A72' }}>{s.label}</span>
        </button>
      ))}
    </div>
  )
}

// Two scales side by side: how the document weighed when first scanned, and after the latest revision.
function BeforeAfter({ c, onUpload }) {
  const first = c.scores[0]
  const last = c.scores.at(-1)
  const revised = c.scores.length > 1
  const delta = last.score - first.score
  const labels = [c.parties?.you, c.parties?.them]
  return (
    <section className="relative mt-6 overflow-hidden rounded-[24px] bg-night p-5 text-night-text sm:p-7">
      <div className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-glow-heat/15 blur-[80px]" />
      <div className={`relative grid items-center gap-4 ${revised ? 'md:grid-cols-[1fr_auto_1fr]' : 'md:grid-cols-[1fr_1fr]'}`}>
        <div className="text-center">
          <Scales angle={scaleAngle(first.score)} labels={labels} size={300} />
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-night-muted">{first.label}</p>
          <p className="num text-4xl font-extrabold">{first.score}<span className="text-base text-night-muted">/100</span></p>
        </div>
        {revised ? (
          <>
            <div className="flex flex-col items-center gap-2">
              <motion.span initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.6, duration: 0.8, ease: EASE }} className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                <ArrowRight size={26} />
              </motion.span>
              <span className={`num text-[44px] font-extrabold leading-none ${delta >= 0 ? 'text-glow-money' : 'text-[#E8798C]'}`}>
                <CountTo to={delta} prefix={delta >= 0 ? '+' : ''} onMount delay={0.8} duration={1.4} />
              </span>
              <span className="text-xs font-bold text-night-muted">points fairer</span>
            </div>
            <div className="text-center">
              <Scales angle={scaleAngle(last.score)} labels={labels} size={300} />
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-night-muted">{last.label}</p>
              <p className="num text-4xl font-extrabold text-glow-money">{last.score}<span className="text-base text-night-muted">/100</span></p>
            </div>
          </>
        ) : (
          <div className="max-w-sm">
            <p className="font-display text-2xl font-extrabold tracking-[-0.03em]">Got a revised version back?</p>
            <p className="mt-2 text-sm font-semibold text-night-text/70">Upload it and Clausewise will rescan it, mark the clauses that are now fair, and show how much the balance moved.</p>
            <button type="button" onClick={onUpload} className="mt-4 flex h-11 cursor-pointer items-center gap-2 rounded-full bg-glow-heat px-5 text-sm font-extrabold text-night hover:brightness-110"><FileUp size={16} /> Upload revised version</button>
          </div>
        )}
      </div>
    </section>
  )
}

function ClauseTracker({ c, onSet }) {
  const total = c.clauses.length || 1
  const won = c.clauses.filter((x) => x.status === 'agreed').length + 0.5 * c.clauses.filter((x) => x.status === 'partly').length
  const pct = Math.round((won / total) * 100)
  const R = 26
  const C = 2 * Math.PI * R
  return (
    <section className="rounded-[24px] bg-surface p-5 shadow-[0_1px_2px_rgba(18,20,31,0.05)] sm:p-6 lg:col-span-7">
      <div className="mb-5 flex items-center gap-4">
        <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0" aria-label={`${pct}% won`}>
          <circle cx="32" cy="32" r={R} fill="none" stroke="#EFEADF" strokeWidth="7" />
          <motion.circle cx="32" cy="32" r={R} fill="none" stroke="#1F6F55" strokeWidth="7" strokeLinecap="round" transform="rotate(-90 32 32)"
            strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - pct / 100) }} transition={{ duration: 1.2, ease: EASE }} />
          <text x="32" y="37" textAnchor="middle" className="num" fontSize="15" fontWeight="800" fill="#12141F">{pct}%</text>
        </svg>
        <div>
          <h2 className="text-[15px] font-extrabold">What changed, clause by clause</h2>
          <p className="text-xs font-bold text-muted">Mark each flagged clause as the {(c.parties?.them || 'other side').toLowerCase()} responds.</p>
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        {c.clauses.map((x, i) => <TrackerRow key={x.clause_id} x={x} index={i} onSet={onSet} />)}
        {c.clauses.length === 0 && <p className="text-sm font-semibold text-muted">No clauses were flagged in this document.</p>}
      </div>
    </section>
  )
}

function TrackerRow({ x, index, onSet }) {
  const [note, setNote] = useState(x.note || '')
  const sev = SEVERITY[x.severity] || SEVERITY.amber
  const out = OUTCOME[x.status] || OUTCOME.pending
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, ease: EASE, delay: index * 0.05 }}
      className="rounded-2xl border p-3.5 transition"
      style={{ borderColor: x.status === 'pending' ? '#E7E1D4' : out.color + '55', background: x.status === 'pending' ? '#FFFFFF' : out.soft + '80' }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="num flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold" style={{ background: sev.soft, color: sev.text }}>{x.number}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-extrabold">{x.title} {x.rule_id && <span className="num ml-1 rounded-full bg-ink px-1.5 py-0.5 text-[10px] text-glow-money">{x.rule_id}</span>}</span>
          <span className="truncate text-xs font-semibold text-muted">{x.reason}</span>
        </span>
        <div className="flex rounded-full bg-paper p-0.5 text-[11px] font-extrabold">
          {Object.entries(OUTCOME).map(([k, o]) => (
            <button type="button" key={k} onClick={() => k !== x.status && onSet(x.clause_id, k, note)} className="relative cursor-pointer rounded-full px-2.5 py-1.5">
              {x.status === k && <motion.span layoutId={`out-${x.clause_id}`} className="absolute inset-0 rounded-full" style={{ background: o.color }} transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              <span className={`relative ${x.status === k ? 'text-white' : 'text-muted'}`}>{o.label}</span>
            </button>
          ))}
        </div>
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => note !== (x.note || '') && onSet(x.clause_id, x.status, note)}
        placeholder="Add what was agreed (optional)"
        className="mt-2.5 w-full rounded-xl border border-transparent bg-white/70 px-3 py-2 text-xs font-semibold outline-none placeholder:text-muted/70 focus:border-line"
      />
    </motion.div>
  )
}

const EVENT_ICON = { scanned: FileCheck, status: Flag, message_sent: Send, reply: MessageSquareReply, revised: FileUp, note: FileText }

// The negotiation as a vertical story; the spine draws downward as you scroll through it.
function NegotiationTimeline({ c, onLog }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 60%'] })
  const [reply, setReply] = useState('')
  const them = c.parties?.them || 'Other party'
  const events = [...c.events].reverse()

  return (
    <section className="rounded-[24px] bg-surface p-5 shadow-[0_1px_2px_rgba(18,20,31,0.05)] sm:p-6 lg:col-span-5">
      <h2 className="text-[15px] font-extrabold">Negotiation timeline</h2>
      <p className="text-xs font-bold text-muted">Newest first</p>

      <form
        onSubmit={(e) => { e.preventDefault(); if (reply.trim()) { onLog('reply', `${them}: “${reply.trim()}”`); setReply('') } }}
        className="mt-4 rounded-2xl bg-paper p-3"
      >
        <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} placeholder={`What did the ${them.toLowerCase()} say?`} className="w-full resize-none bg-transparent text-sm font-semibold outline-none placeholder:text-muted/70" />
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="submit" className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-ink px-4 text-xs font-extrabold text-white"><MessageSquareReply size={14} /> Log their reply</button>
          <button type="button" onClick={() => onLog('message_sent', `Sent the negotiation message to the ${them.toLowerCase()}.`)} className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-xs font-extrabold"><Send size={14} /> I sent the message</button>
        </div>
      </form>

      <div ref={ref} className="relative mt-6 pl-9">
        <div className="absolute bottom-2 left-[15px] top-2 w-[2px] rounded-full bg-line" />
        <motion.div className="absolute bottom-2 left-[15px] top-2 w-[2px] origin-top rounded-full bg-ink" style={{ scaleY: scrollYProgress }} />
        <AnimatePresence initial={false}>
          {events.map((e, i) => {
            const status = e.meta?.status
            const Ico = e.kind === 'clause_update' ? (status === 'refused' ? CircleX : CircleCheckBig) : EVENT_ICON[e.kind] || FileText
            const tone = e.kind === 'clause_update' ? OUTCOME[status] || OUTCOME.pending : e.kind === 'revised' ? OUTCOME.agreed : { color: '#12141F', soft: '#EFEADF' }
            return (
              <motion.div
                key={`${e.at}-${e.kind}-${i}`}
                layout
                initial={{ opacity: 0, x: 20, filter: 'blur(6px)' }}
                whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="relative mb-5 last:mb-0"
              >
                <span className="absolute -left-9 top-0 flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-surface" style={{ background: tone.soft, color: tone.color }}>
                  <Ico size={15} />
                </span>
                <p className="text-[13px] font-semibold leading-snug text-ink">{e.text}</p>
                <p className="mt-0.5 text-[11px] font-bold text-muted">{timeAgo(e.at)}</p>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </section>
  )
}
