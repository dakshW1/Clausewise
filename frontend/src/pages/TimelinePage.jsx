import { motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion'
import { CalendarPlus, Repeat, Zap } from 'lucide-react'
import { useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import MoneySimulator from '../components/MoneySimulator'
import { downloadIcs, keyDates } from '../lib/calendar'
import { useStore } from '../lib/store'
import { rupees } from '../lib/theme'
import { hasTimeline, PageHead } from './ReportLayout'

const C = { gold: '#E9E5DC', green: '#8FCBA8', blue: '#9DB4D8', red: '#E38B93', amber: '#D9B56E' }

export default function TimelinePage() {
  const { analysis, focus: setFocus } = useStore()
  const navigate = useNavigate()
  if (!hasTimeline(analysis)) return <Navigate to="/report" replace />
  // The clause cards live on their own page, so tapping a marker takes you there.
  const focus = (ids, rules) => { setFocus(ids, rules); navigate('/report/clauses') }
  return (
    <>
      <PageHead
        kicker={['05', 'Timeline']}
        title="Scroll through"
        accent="your tenancy."
        sub="Each month shows what you can do, what it costs to leave, and the risks that can land at any time."
      />
      <KeyDates analysis={analysis} />
      <ScrubTimeline analysis={analysis} onFocus={focus} />
      <div className="mt-8">
        <MoneySimulator analysis={analysis} onFocus={focus} />
      </div>
    </>
  )
}

// Calendar-leaf tiles for each key date, and an .ics download with reminders two days before.
function KeyDates({ analysis }) {
  const dates = keyDates(analysis)
  if (!dates.length) return null
  return (
    <section className="mb-6 rounded-[24px] bg-surface p-5 shadow-[0_1px_2px_rgba(20,20,20,0.05)] sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-extrabold">Key dates</h2>
          <p className="text-xs font-bold text-muted">Reminders arrive two days before each one</p>
        </div>
        <button type="button" onClick={() => downloadIcs(analysis, dates)} className="flex h-11 cursor-pointer items-center gap-2 rounded-full bg-ink px-5 text-sm font-extrabold text-white transition hover:bg-ink-2">
          <CalendarPlus size={16} /> Add to calendar
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 [&>*]:min-w-0">
        {dates.map((d, i) => (
          <motion.div
            key={d.key}
            initial={{ opacity: 0, rotateX: -60, y: 20 }}
            whileInView={{ opacity: 1, rotateX: 0, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, delay: i * 0.1, type: 'spring', stiffness: 140, damping: 16 }}
            style={{ transformPerspective: 600, transformOrigin: 'top' }}
            className="flex gap-3"
          >
            <div className="w-16 shrink-0 overflow-hidden rounded-xl border border-line text-center">
              <div className="bg-ink py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white">{d.date.toLocaleString('en-IN', { month: 'short' })}</div>
              <div className="num py-1.5 text-2xl font-extrabold leading-none">{d.date.getDate()}</div>
              <div className="pb-1 text-[10px] font-bold text-muted">{d.date.getFullYear()}</div>
            </div>
            <div className="min-w-0 pt-1">
              <p className="text-sm font-extrabold leading-tight">{d.title}</p>
              <p className="mt-0.5 text-xs font-semibold text-muted">{d.detail}</p>
              {d.repeat && <p className="mt-1 flex items-center gap-1 text-[11px] font-extrabold text-ink-2"><Repeat size={11} /> Monthly × {d.repeat}</p>}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

// A tall section with a pinned timeline: scroll progress drives the month cursor, the events and the refund gauge.
function ScrubTimeline({ analysis, onFocus }) {
  const kv = analysis.key_values
  const term = kv.term_months || 11
  const start = kv.start_date ? new Date(kv.start_date + 'T00:00:00') : null
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 140px', 'end end'] })
  const [month, setMonth] = useState(0)
  useMotionValueEvent(scrollYProgress, 'change', (p) => setMonth(Math.min(term, Math.max(0, p * term))))
  const cursor = useTransform(scrollYProgress, (p) => `${Math.min(100, Math.max(0, p * 100))}%`)

  const pct = (m) => (Math.min(Math.max(m, 0), term) / term) * 100
  const monthName = (m) => {
    if (!start) return `Month ${Math.round(m)}`
    const d = new Date(start.getFullYear(), start.getMonth() + Math.floor(m), 1)
    return d.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
  }
  const short = (m) => {
    if (!start) return `M${m}`
    const d = new Date(start.getFullYear(), start.getMonth() + m, 1)
    return d.toLocaleString('en-IN', { month: 'short' })
  }
  const clause = (cat) => analysis.clauses.find((c) => c.category === cat)
  const focusCat = (cat) => { const c = clause(cat); if (c) onFocus([c.id], c.rule_id ? [c.rule_id] : []) }
  const noRefundDate = analysis.missing.some((m) => m.category === 'refund_timeline')
  const noticeMonths = kv.tenant_notice_days ? Math.round(kv.tenant_notice_days / 30) : null
  const penalty = (kv.lock_in_penalty_months || 1) * (kv.rent || 0)

  const events = [
    { m: 0, title: 'Move in', text: kv.deposit ? `You hand over ${rupees(kv.deposit)} as deposit${kv.deposit_months ? `, ${kv.deposit_months}× the rent` : ''}.` : 'The tenancy starts.', color: C.gold, cat: 'deposit' },
    kv.lock_in_months && { m: kv.lock_in_months, title: 'Lock-in ends', text: 'From here you can leave without the lock-in penalty, with notice.', color: C.green, cat: 'lock_in' },
    noticeMonths && { m: term - noticeMonths, title: 'Last day to give notice', text: `Give ${noticeMonths} months’ written notice by now to leave when the term ends.`, color: C.blue, cat: 'notice' },
    { m: term, title: 'Agreement ends', text: noRefundDate ? 'Nothing says when your deposit comes back.' : 'Your deposit should be refunded now.', color: noRefundDate ? C.red : C.green, cat: 'refund' },
  ].filter(Boolean)
  const current = [...events].reverse().find((e) => month >= e.m - 0.02) ?? events[0]

  const risks = []
  const rev = clause('rent_revision')
  if (rev && rev.severity !== 'green') risks.push({ cat: 'rent_revision', text: `Rent can rise ${kv.rent_increase_pct ? kv.rent_increase_pct + '% ' : ''}today`, kind: 'ticks' })
  const ev = clause('eviction')
  if (ev && ev.severity !== 'green') risks.push({ cat: 'eviction', text: `A ${kv.landlord_notice_days || 15}-day eviction notice can land today`, kind: 'window' })
  const ess = clause('essential_services')
  if (ess && ess.severity !== 'green') risks.push({ cat: 'essential_services', text: 'Power and water can be cut if you pay late', kind: 'zap' })

  const inLockIn = kv.lock_in_months && month < kv.lock_in_months
  const back = kv.deposit != null ? kv.deposit - (inLockIn ? penalty : 0) : null
  const months = Array.from({ length: term + 1 }, (_, m) => m)

  return (
    <section ref={ref} style={{ height: `${Math.max(220, term * 26)}vh` }} className="relative">
      <div className="sticky top-[140px]">
        <div className="relative overflow-hidden rounded-[24px] bg-night p-5 text-night-text sm:p-7">
          <div className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-glow-heat/15 blur-[80px]" />

          <div className="relative grid gap-6 md:grid-cols-[1.3fr_1fr] [&>*]:min-w-0">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-night-muted">Month {Math.floor(month)} of {term}</p>
              <p className="num mt-1 text-[clamp(30px,4vw,48px)] font-extrabold leading-none tracking-[-0.04em]">{monthName(month)}</p>
              <motion.button
                type="button"
                key={current.title}
                onClick={() => focusCat(current.cat)}
                initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                className="mt-4 block cursor-pointer text-left"
              >
                <span className="text-lg font-extrabold" style={{ color: current.color }}>{current.title}</span>
                <span className="mt-1 block max-w-md text-[15px] font-semibold text-night-text/75">{current.text}</span>
              </motion.button>
            </div>
            {back != null && (
              <div className="rounded-2xl border border-night-line bg-night-2/80 p-4">
                <p className="text-xs font-bold text-night-muted">If you left this month, you’d get back</p>
                <p className={`num mt-1 text-[40px] font-extrabold leading-none tracking-[-0.03em] ${inLockIn ? 'text-[#E38B93]' : 'text-glow-money'}`}>{rupees(back)}</p>
                <p className="mt-2 text-xs font-semibold text-night-text/65">
                  {inLockIn ? `Inside the lock-in: ${rupees(penalty)} is kept.` : 'Past the lock-in: no penalty.'} Deductions under clause {clause('refund')?.number ?? '–'} may lower this.
                </p>
              </div>
            )}
          </div>

          {/* month axis and track */}
          <div className="relative mt-8">
            <div className="relative mb-2 h-5">
              {months.map((m) => (
                <span key={m} className={`num absolute -translate-x-1/2 text-[11px] font-bold transition ${m <= month ? 'text-night-text' : 'text-night-muted/60'}`} style={{ left: `${pct(m)}%` }}>{short(m)}</span>
              ))}
            </div>
            <div className="relative h-16">
              <div className="absolute inset-x-0 top-[26px] h-3 rounded-full bg-white/10" />
              {kv.lock_in_months && (
                <button type="button" onClick={() => focusCat('lock_in')} className="hatch absolute left-0 top-[22px] h-5 cursor-pointer rounded-full border border-[#D9B56E]/70" style={{ width: `${pct(kv.lock_in_months)}%` }} aria-label="Lock-in period" />
              )}
              <motion.div className="absolute left-0 top-[26px] h-3 rounded-full bg-gradient-to-r from-glow-heat to-glow-money opacity-60" style={{ width: cursor }} />
              <motion.div className="absolute top-[12px] h-10 w-[2px] -translate-x-1/2 bg-glow-heat shadow-[0_0_14px_#E9E5DC]" style={{ left: cursor }} />
              {events.map((e) => {
                const reached = month >= e.m - 0.02
                return (
                  <button type="button" key={e.title} onClick={() => focusCat(e.cat)} className="absolute top-[24px] -translate-x-1/2 cursor-pointer" style={{ left: `${pct(e.m)}%` }} aria-label={e.title}>
                    <motion.span
                      className="block h-4 w-4 rotate-45 rounded-[3px] border-2 bg-night"
                      animate={{ scale: reached ? 1.25 : 0.8, opacity: reached ? 1 : 0.35 }}
                      style={{ borderColor: e.color, boxShadow: reached ? `0 0 16px ${e.color}` : 'none' }}
                    />
                  </button>
                )
              })}
            </div>
          </div>

          {risks.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {risks.map((r) => (
                <button type="button" key={r.cat} onClick={() => focusCat(r.cat)} className="flex cursor-pointer items-center gap-2 rounded-full border border-[#E38B93]/40 bg-[#E38B93]/10 px-3 py-1.5 text-xs font-extrabold text-[#E38B93]">
                  {r.kind === 'zap' ? <Zap size={12} fill="currentColor" /> : <span className="pulse-ring-dot relative flex h-2 w-2"><span className="pulse-ring absolute h-full w-full rounded-full bg-[#E38B93]" /><span className="relative h-2 w-2 rounded-full bg-[#E38B93]" /></span>}
                  {r.text}
                </button>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs font-bold text-night-muted">Keep scrolling to move through the months · tap a marker to see its clause</p>
        </div>
      </div>
    </section>
  )
}
