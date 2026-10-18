import { motion } from 'framer-motion'
import { EASE } from './motion-bits'
import { Card, CardHead } from './ui'

function gap(c) {
  if (c.yours === 0) return 'none given'
  const ratio = c.yours / c.benchmark
  return ratio > 1 ? `${ratio.toFixed(1)}× the limit` : `${Math.round(ratio * 100)}% of the norm`
}

export default function BenchmarkBars({ analysis, active, onFocus }) {
  return (
    <Card className="lg:col-span-7" delay={0.15}>
      <CardHead title="Where the numbers break the law" sub="your agreement vs model law" />
      <div className="flex flex-col gap-2">
        {analysis.comparisons.map((c, i) => {
          const max = Math.max(c.yours, c.benchmark) * 1.1 || 1
          const isActive = active.clauseIds.includes(c.clause_id)
          const unit = c.unit.replace('months of rent', '× rent')
          return (
            <button
              type="button"
              key={c.label}
              onClick={() => onFocus([c.clause_id], c.rule_id ? [c.rule_id] : [])}
              className={`flex w-full cursor-pointer flex-col gap-2 rounded-2xl p-3 text-left transition ${isActive ? 'bg-paper ring-2 ring-ink' : 'hover:bg-paper'}`}
            >
              <div className="flex items-baseline justify-between gap-3 text-sm font-bold">
                <span>{c.label}</span>
                <span className="text-xs font-extrabold text-danger">{gap(c)}</span>
              </div>
              {[
                { name: 'Yours', v: c.yours, cls: c.yours > c.benchmark || c.yours === 0 ? 'bg-danger' : 'bg-money' },
                { name: 'Law', v: c.benchmark, cls: 'bg-money' },
              ].map((b, j) => (
                <div key={b.name} className="flex items-center gap-3">
                  <span className="w-10 text-xs font-bold text-muted">{b.name}</span>
                  <span className="relative block h-2.5 flex-1 rounded-full bg-paper">
                    <motion.span
                      className={`absolute inset-y-0 left-0 block rounded-full ${b.cls}`}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${Math.max(b.v === 0 ? 1.5 : 4, (b.v / max) * 100)}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, delay: 0.15 + i * 0.12 + j * 0.08, ease: EASE }}
                    />
                  </span>
                  <span className="num w-20 text-right text-sm font-extrabold">{b.v} <span className="text-xs font-bold text-muted">{unit}</span></span>
                </div>
              ))}
            </button>
          )
        })}
      </div>
    </Card>
  )
}
