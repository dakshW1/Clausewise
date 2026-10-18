import { motion } from 'framer-motion'
import { Gavel, LoaderCircle, Shield, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { SEVERITY } from '../lib/theme'
import { EASE } from './motion-bits'

const debates = new Map()

// Both sides argue each flagged clause, then a judge gives a balanced view: fair, not one-sided.
export default function DebatePanel({ analysis }) {
  const key = `${analysis.title}|${analysis.score}|${analysis.clauses.length}`
  const [data, setData] = useState(() => debates.get(key) ?? null)
  const you = analysis.parties?.you || 'You'
  const them = analysis.parties?.them || 'Other side'

  useEffect(() => {
    if (debates.has(key)) return
    api.debate(analysis).then((d) => { debates.set(key, d); setData(d) }).catch((e) => setData({ debate: [], overall: '', notice: e.message }))
  }, [key, analysis])

  const byId = Object.fromEntries(analysis.clauses.map((c) => [c.id, c]))

  return (
    <section className="lg:col-span-12">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-extrabold tracking-[-0.03em]">Both sides, then a verdict</h2>
          <p className="text-sm font-semibold text-muted">Your advocate, the {them.toLowerCase()}’s honest view, and a neutral judge, on each flagged clause.</p>
        </div>
        <div className="flex gap-2 text-[11px] font-extrabold">
          <span className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5"><Shield size={12} /> {you}’s advocate</span>
          <span className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5"><UserRound size={12} /> {them}’s view</span>
          <span className="flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-white"><Gavel size={12} /> Judge</span>
        </div>
      </div>

      {!data && (
        <div className="flex items-center gap-3 rounded-[24px] bg-surface p-6 text-sm font-bold text-muted">
          <LoaderCircle size={16} className="animate-spin" /> The agents are debating…
          <span className="flex gap-1">{[0, 1, 2].map((d) => <motion.span key={d} className="h-1.5 w-1.5 rounded-full bg-muted" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }} />)}</span>
        </div>
      )}
      {data?.notice && <p className="rounded-[24px] bg-surface p-6 text-sm font-semibold text-muted">{data.notice}</p>}

      {data?.overall && (
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: EASE }} className="mb-4 flex items-start gap-4 rounded-[24px] bg-night p-5 text-night-text sm:p-6">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10"><Gavel size={22} /></span>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-night-muted">The judge’s overall view</p>
            <p className="mt-1 font-serif text-[22px] italic leading-snug">{data.overall}</p>
          </div>
        </motion.div>
      )}

      <div className="flex flex-col gap-4">
        {data?.debate.map((d) => {
          const c = byId[d.clause_id]
          if (!c) return null
          const s = SEVERITY[c.severity]
          return (
            <div key={d.clause_id} className="rounded-[24px] bg-surface p-5 shadow-[0_1px_2px_rgba(20,20,20,0.05)] sm:p-6">
              <p className="mb-4 flex items-center gap-2 text-sm font-extrabold">
                <span className="num flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: s.soft, color: s.text }}>{c.number}</span>
                {c.title}
                {c.rule_id && <span className="num rounded-full bg-ink px-2 py-0.5 text-[10px] text-glow-money">{c.rule_id}</span>}
              </p>
              <div className="grid gap-3 md:grid-cols-2 [&>*]:min-w-0">
                <Bubble side="left" icon={Shield} who={`${you}’s advocate`} text={d.advocate} delay={0} />
                <Bubble side="right" icon={UserRound} who={`${them}’s view`} text={d.other_side} delay={0.25} />
              </div>
              <motion.div
                initial={{ opacity: 0, y: 14, scale: 0.97 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.5 }}
                className="mx-auto mt-3 flex max-w-2xl items-start gap-3 rounded-2xl bg-ink p-4 text-white"
              >
                <Gavel size={18} className="mt-0.5 shrink-0 text-glow-money" />
                <span className="text-sm font-semibold leading-snug"><b className="text-glow-money">Judge: </b>{d.verdict}</span>
              </motion.div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Bubble({ side, icon: Icon, who, text, delay }) {
  const left = side === 'left'
  return (
    <motion.div
      initial={{ opacity: 0, x: left ? -24 : 24, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.55, ease: EASE, delay }}
      className={`flex gap-3 ${left ? '' : 'md:flex-row-reverse md:text-right'}`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${left ? 'bg-money-soft text-money' : 'bg-paper text-ink-2'}`}><Icon size={18} /></span>
      <div className={`rounded-2xl p-3.5 ${left ? 'rounded-tl-sm bg-money-soft/60' : 'rounded-tr-sm bg-paper'}`}>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">{who}</p>
        <p className="mt-1 text-sm font-semibold leading-snug text-ink">{text}</p>
      </div>
    </motion.div>
  )
}
