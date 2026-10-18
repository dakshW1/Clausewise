import { motion, useSpring, useTransform } from 'framer-motion'
import { useEffect, useState } from 'react'
import { rupees } from '../lib/theme'
import { Card, CardHead } from './ui'

const CHART_H = 200

function Money({ value }) {
  const s = useSpring(value, { stiffness: 90, damping: 18 })
  useEffect(() => s.set(value), [value, s])
  const text = useTransform(s, (v) => rupees(v))
  return <motion.span>{text}</motion.span>
}

// "What if I leave after N months?" A waterfall from the deposit paid down to what actually comes back.
export default function MoneySimulator({ analysis, onFocus }) {
  const kv = analysis.key_values
  const term = kv.term_months || 11
  const [month, setMonth] = useState(Math.max(1, (kv.lock_in_months || 6) - 2))
  if (!kv.deposit || !kv.rent) return null

  const refund = analysis.clauses.find((c) => c.category === 'refund')
  const discretionary = refund && refund.severity !== 'green'
  const D = kv.deposit
  const penalty = kv.lock_in_months && month < kv.lock_in_months ? (kv.lock_in_penalty_months || 1) * kv.rent : 0
  const best = D - penalty
  const worst = Math.max(0, best - (discretionary ? kv.rent : 0))
  const lawDeposit = 2 * kv.rent
  const y = (v) => (v / D) * CHART_H
  const focusCat = (cat) => { const c = analysis.clauses.find((x) => x.category === cat); if (c) onFocus([c.id], c.rule_id ? [c.rule_id] : []) }

  const bars = [
    { key: 'paid', name: 'Deposit paid', low: 0, high: D, cls: 'bg-[#E2DFD7]', label: rupees(D) },
    { key: 'pen', name: 'Lock-in penalty', low: best, high: D, cls: 'bg-danger', label: penalty ? '−' + rupees(penalty) : '₹0', cat: 'lock_in' },
    discretionary && { key: 'disc', name: 'No-limit deductions', low: worst, high: best, cls: 'hatch border border-amber', label: '?', cat: 'refund' },
    { key: 'back', name: 'You get back', low: 0, high: best, cls: 'bg-ink', label: rupees(best) },
  ].filter(Boolean)

  return (
    <Card className="lg:col-span-12">
      <CardHead title="What if I leave early?" sub="follow your deposit, month by month" />
      <div className="grid gap-8 md:grid-cols-[0.9fr_1.4fr]">
        <div className="flex flex-col">
          <p className="text-sm font-bold text-muted">I leave after</p>
          <p className="num text-[56px] font-extrabold leading-none tracking-[-0.04em]">{month} <span className="text-xl tracking-normal text-muted">{month === 1 ? 'month' : 'months'}</span></p>
          <input type="range" min="1" max={term} value={month} onChange={(e) => setMonth(+e.target.value)} className="mt-4 w-full" aria-label="Months before leaving" />
          <div className="mt-1 flex justify-between text-[11px] font-bold text-muted"><span>1</span><span>{term} months</span></div>

          <div className="mt-6 rounded-2xl bg-ink p-4 text-white">
            <p className="text-xs font-bold text-white/70">You get back</p>
            <p className="num mt-1 text-[30px] font-extrabold leading-tight text-glow-money">
              {discretionary && worst !== best ? <><Money value={worst} /><span className="text-white/40"> – </span><Money value={best} /></> : <Money value={best} />}
            </p>
            <p className="mt-2 text-xs font-semibold leading-relaxed text-white/70">
              {penalty > 0 ? `Leaving inside the ${kv.lock_in_months}-month lock-in costs ${rupees(penalty)}. ` : 'You are past the lock-in, so no penalty. '}
              {discretionary && `Clause ${refund.number} lets the landlord deduct any amount; the lower figure assumes one month’s rent.`}
            </p>
          </div>
        </div>

        <div>
          <div className="relative flex items-end gap-3" style={{ height: CHART_H + 30 }}>
            <motion.div
              className="absolute inset-x-0 z-10 border-t-2 border-dashed border-money/50"
              initial={{ bottom: 0, opacity: 0 }}
              whileInView={{ bottom: y(lawDeposit), opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 1 }}
            >
              <span className="absolute -top-5 right-0 text-[11px] font-extrabold text-money">law’s deposit cap {rupees(lawDeposit)}</span>
            </motion.div>
            {bars.map((b) => (
              <button type="button" key={b.key} onClick={() => b.cat && focusCat(b.cat)} className={`group relative h-full flex-1 ${b.cat ? 'cursor-pointer' : 'cursor-default'}`}>
                <motion.span
                  className={`absolute inset-x-0 block rounded-lg ${b.cls}`}
                  initial={{ bottom: 0, height: 0 }}
                  animate={{ bottom: y(b.low), height: Math.max(b.high > b.low ? 3 : 0, y(b.high - b.low)) }}
                  transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                />
                <motion.span
                  className="num absolute inset-x-0 block text-center text-[13px] font-extrabold"
                  animate={{ bottom: y(b.high) + 6 }}
                  transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                >
                  {b.label}
                </motion.span>
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-3 border-t border-line pt-2 text-center text-[11px] font-extrabold text-muted">
            {bars.map((b) => <span key={b.key} className="flex-1">{b.name}</span>)}
          </div>
        </div>
      </div>
    </Card>
  )
}
