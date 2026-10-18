import { motion } from 'framer-motion'
import { SEVERITY, scaleAngle, verdict } from '../lib/theme'
import { CountTo, EASE } from './motion-bits'
import Scales from './Scales'
import { Card } from './ui'

// The headline card: the scales weighed down by clause coins, and the fairness score as a ring.
export default function ScorePanel({ analysis }) {
  const { score, counts, clauses, missing } = analysis
  const v = verdict(score, analysis.parties?.them)
  const tenantCoins = clauses.filter((c) => c.severity === 'green').map((c) => ({ id: c.id, color: SEVERITY.green.glow }))
  const landlordCoins = [
    ...clauses.filter((c) => c.severity === 'red').map((c) => ({ id: c.id, color: SEVERITY.red.glow })),
    ...clauses.filter((c) => c.severity === 'amber').map((c) => ({ id: c.id, color: SEVERITY.amber.glow })),
    ...missing.map((m) => ({ id: m.category, color: SEVERITY.missing.glow })),
  ]
  const r = 62
  const C = 2 * Math.PI * r

  return (
    <Card dark className="lg:col-span-7">
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full blur-[70px]" style={{ background: `${v.color}33` }} />
      <div className="relative grid items-center gap-4 sm:grid-cols-[1.1fr_1fr]">
        <div className="-my-2">
          <Scales angle={scaleAngle(score)} tenantCoins={tenantCoins} landlordCoins={landlordCoins} labels={[analysis.parties?.you, analysis.parties?.them]} size={380} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-night-muted">Fairness score</span>
          <div className="flex items-center gap-4">
            <svg width="132" height="132" viewBox="0 0 150 150" className="shrink-0" role="img" aria-label={`Fairness ${score} out of 100`}>
              <circle cx="75" cy="75" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="14" />
              <motion.circle
                cx="75" cy="75" r={r} fill="none" stroke={v.color} strokeWidth="14" strokeLinecap="round" transform="rotate(-90 75 75)"
                strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - score / 100) }}
                transition={{ duration: 1.6, ease: EASE, delay: 0.2 }}
              />
              <text x="75" y="82" textAnchor="middle" className="num" fill="#EEEAE0" fontSize="34" fontWeight="800">{score}</text>
              <text x="75" y="102" textAnchor="middle" fill="#9B9AA6" fontSize="11" fontWeight="700">of 100</text>
            </svg>
            <div>
              <p className="font-serif text-[44px] italic leading-none" style={{ color: v.color }}>{v.text}</p>
              <p className="mt-1 text-[13px] font-semibold text-night-text/70">{v.sub}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {['red', 'amber', 'green', 'missing'].map((k, i) => (
              <motion.div
                key={k}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.08, ease: EASE }}
                className="flex items-center gap-2.5 rounded-2xl bg-white/5 px-3 py-2.5"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: SEVERITY[k].glow }} />
                <span className="num text-xl font-extrabold"><CountTo to={counts[k]} onMount delay={0.6 + i * 0.08} duration={0.8} /></span>
                <span className="text-xs font-bold text-night-muted">{SEVERITY[k].short}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}
