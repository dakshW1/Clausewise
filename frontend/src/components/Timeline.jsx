import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import { rupees } from '../lib/theme'
import { Card, CardHead } from './ui'

const SWEEP = 3
const C = { gold: '#D8B26A', green: '#7FD1AE', blue: '#93AEDB', red: '#E8798C', amber: '#E3B95C' }

// The tenancy laid out month by month: key dates as markers, risky clauses as lanes that can strike at any time.
export default function Timeline({ analysis, onFocus }) {
  const kv = analysis.key_values
  const term = kv.term_months || 11
  const start = kv.start_date ? new Date(kv.start_date + 'T00:00:00') : null
  const pct = (m) => (Math.min(Math.max(m, 0), term) / term) * 100
  const label = (m) => {
    if (!start) return `M${m}`
    const d = new Date(start.getFullYear(), start.getMonth() + m, 1)
    return d.toLocaleString('en-IN', { month: 'short' }) + (d.getMonth() === 0 || m === 0 ? ` ’${String(d.getFullYear()).slice(2)}` : '')
  }
  const clause = (cat) => analysis.clauses.find((c) => c.category === cat)
  const focus = (cat) => { const c = clause(cat); if (c) onFocus([c.id], c.rule_id ? [c.rule_id] : []) }
  const noRefundDate = analysis.missing.some((m) => m.category === 'refund_timeline')
  const noticeMonths = kv.tenant_notice_days ? Math.round(kv.tenant_notice_days / 30) : null

  const events = [
    { m: 0, title: 'Move in', sub: kv.deposit ? `Pay ${rupees(kv.deposit)} deposit` : 'Tenancy starts', color: C.gold, cat: 'deposit' },
    kv.lock_in_months && { m: kv.lock_in_months, title: 'Lock-in ends', sub: 'Free to leave with notice', color: C.green, cat: 'lock_in' },
    noticeMonths && { m: term - noticeMonths, title: 'Give notice by', sub: `${label(term - noticeMonths)} to leave at the end`, color: C.blue, cat: 'notice' },
    { m: term, title: 'Agreement ends', sub: noRefundDate ? 'No date for deposit refund' : 'Deposit refund due', color: noRefundDate ? C.red : C.green, cat: 'refund', pulse: noRefundDate },
  ].filter(Boolean)

  const lanes = []
  const rev = clause('rent_revision')
  if (rev && rev.severity !== 'green') lanes.push({ kind: 'ticks', cat: 'rent_revision', color: C.red, text: `Rent can rise ${kv.rent_increase_pct ? kv.rent_increase_pct + '% ' : ''}on any day`, n: rev.number })
  const ev = clause('eviction')
  if (ev && ev.severity !== 'green') lanes.push({ kind: 'window', cat: 'eviction', color: C.red, text: `A ${kv.landlord_notice_days || 15}-day eviction notice can land any time`, n: ev.number })
  const ess = clause('essential_services')
  if (ess && ess.severity !== 'green') lanes.push({ kind: 'zap', cat: 'essential_services', color: C.amber, text: 'Power and water can be cut if a payment is late', n: ess.number })

  const windowW = ((kv.landlord_notice_days || 15) / 30 / term) * 100
  const months = Array.from({ length: term + 1 }, (_, m) => m)

  return (
    <Card dark className="lg:col-span-12">
      <div className="absolute -left-16 -top-24 h-64 w-64 rounded-full bg-glow-heat/15 blur-[80px]" />
      <div className="relative">
        <CardHead dark title="Your tenancy, month by month" sub={`${term} months · tap a marker to see the clause`} />
        <div className="relative mb-2 h-5">
          {months.map((m) => (
            <span key={m} className="num absolute -translate-x-1/2 text-[11px] font-bold text-night-muted" style={{ left: `${pct(m)}%` }}>{label(m)}</span>
          ))}
        </div>

        <div className="relative h-36">
          <div className="absolute inset-x-0 top-[68px] h-3 rounded-full bg-white/10" />
          {kv.lock_in_months && (
            <motion.button
              type="button"
              onClick={() => focus('lock_in')}
              className="hatch absolute left-0 top-[64px] h-5 cursor-pointer rounded-full border border-[#E3B95C]/70"
              initial={{ width: 0 }}
              whileInView={{ width: `${pct(kv.lock_in_months)}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, delay: 0.3 }}
            >
              <span className="absolute -bottom-6 left-2 whitespace-nowrap text-[11px] font-extrabold text-[#E3B95C]">
                Lock-in · leaving costs {rupees((kv.lock_in_penalty_months || 1) * (kv.rent || 0))}
              </span>
            </motion.button>
          )}
          <motion.div
            className="absolute top-[68px] h-3 rounded-full bg-gradient-to-r from-glow-heat to-glow-gold opacity-50"
            initial={{ width: 0 }} whileInView={{ width: '100%' }} viewport={{ once: true }}
            transition={{ duration: SWEEP, ease: 'linear' }}
          />
          <motion.div
            className="absolute top-[52px] h-11 w-[2px] bg-glow-heat shadow-[0_0_14px_#D8B26A]"
            initial={{ left: '0%' }}
            whileInView={{ left: '100%', opacity: [1, 1, 0] }}
            viewport={{ once: true }}
            transition={{ duration: SWEEP, ease: 'linear', opacity: { duration: SWEEP + 0.6, times: [0, 0.85, 1] } }}
          />

          {events.map((e, i) => {
            const up = i % 2 === 0
            const align = e.m === 0 ? 'left-0' : e.m === term ? 'right-0 text-right' : 'left-1/2 -translate-x-1/2'
            return (
              <motion.button
                type="button"
                key={e.title}
                onClick={() => focus(e.cat)}
                className="absolute top-[74px] -translate-x-1/2 cursor-pointer"
                style={{ left: `${pct(e.m)}%` }}
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + (pct(e.m) / 100) * SWEEP, type: 'spring', stiffness: 300, damping: 15 }}
              >
                <span className="relative block -translate-y-1/2">
                  <span className="block h-4 w-4 rotate-45 rounded-[3px] border-2 bg-night" style={{ borderColor: e.color, boxShadow: `0 0 14px ${e.color}` }} />
                  {e.pulse && <span className="pulse-ring absolute inset-0 rotate-45 rounded-[3px] border-2" style={{ borderColor: e.color }} />}
                </span>
                <span className={`absolute ${align} ${up ? 'bottom-[30px]' : 'top-[22px]'} block w-max max-w-[160px]`}>
                  <span className="block text-xs font-extrabold" style={{ color: e.color }}>{e.title}</span>
                  <span className="block text-[11px] font-semibold leading-snug text-night-muted">{e.sub}</span>
                </span>
              </motion.button>
            )
          })}
        </div>

        <div className="mt-8 flex flex-col gap-4">
          {lanes.map((l, i) => (
            <motion.button
              type="button"
              key={l.cat}
              onClick={() => focus(l.cat)}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: SWEEP * 0.6 + i * 0.2 }}
              className="block w-full cursor-pointer text-left"
            >
              <span className="mb-1.5 flex items-center justify-between text-xs font-extrabold" style={{ color: l.color }}>
                {l.text}<span className="num text-night-muted">Clause {l.n}</span>
              </span>
              <span className="relative block h-5 overflow-hidden rounded-full border border-dashed" style={{ borderColor: `${l.color}66`, background: `${l.color}10` }}>
                {l.kind === 'window' && (
                  <motion.span
                    className="absolute inset-y-0.5 block rounded-full"
                    style={{ width: `${windowW}%`, background: l.color, boxShadow: `0 0 16px ${l.color}` }}
                    animate={{ left: ['0%', `${100 - windowW}%`] }}
                    transition={{ duration: 5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
                  />
                )}
                {l.kind === 'ticks' && months.slice(1).map((m) => (
                  <motion.span
                    key={m}
                    className="absolute top-1/2 block h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{ left: `${pct(m - 0.5)}%`, background: l.color }}
                    animate={{ opacity: [0.15, 1, 0.15], scale: [0.7, 1.2, 0.7] }}
                    transition={{ duration: 2.2, repeat: Infinity, delay: m * 0.18 }}
                  />
                ))}
                {l.kind === 'zap' && months.slice(0, -1).map((m) => (
                  <motion.span
                    key={m}
                    className="absolute top-1/2 block -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${pct(m + 0.15)}%`, color: l.color }}
                    animate={{ opacity: [0.2, 1, 0.2, 0.8, 0.2] }}
                    transition={{ duration: 1.8, repeat: Infinity, delay: m * 0.25 }}
                  >
                    <Zap size={12} fill="currentColor" />
                  </motion.span>
                ))}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </Card>
  )
}
