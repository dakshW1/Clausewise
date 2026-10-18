import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Plus, Quote } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { SEVERITY } from '../lib/theme'
import { EASE } from './motion-bits'
import { Card, CardHead, Chip } from './ui'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'red', label: 'Unfair' },
  { key: 'amber', label: 'Unusual' },
  { key: 'green', label: 'Fair' },
]

function ClauseCard({ c, rule, active, first, activeT, onSpy }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const s = SEVERITY[c.severity]

  useEffect(() => {
    if (active) {
      setOpen(true)
      if (!first) return
      // Only the first cited clause scrolls; wait for the chat panel's own smooth scroll, which would otherwise cancel this one.
      const id = setTimeout(() => {
        const box = ref.current?.getBoundingClientRect()
        if (box) window.scrollTo({ top: window.scrollY + box.top - window.innerHeight / 2 + Math.min(box.height, 200) / 2, behavior: 'smooth' })
      }, 450)
      return () => clearTimeout(id)
    }
  }, [active, first, activeT])

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ ease: EASE, duration: 0.5 }}
      viewport={{ amount: 0.6 }}
      onViewportEnter={() => onSpy?.(c.id)}
      className={`relative overflow-hidden rounded-2xl border transition ${active ? 'border-ink shadow-[0_10px_40px_rgba(18,20,31,0.12)]' : 'border-line'}`}
    >
      {active && <motion.div className="pointer-events-none absolute inset-0" style={{ background: s.soft }} initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 2.4 }} />}
      <button type="button" onClick={() => setOpen((o) => !o)} className="relative flex w-full cursor-pointer items-start gap-3 p-4 text-left">
        <span className="num flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-extrabold" style={{ background: s.soft, color: s.text }}>{c.number}</span>
        <span className="flex flex-1 flex-col">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-extrabold">{c.title}</span>
            <Chip color={s.text} soft={s.soft}>{s.label}</Chip>
            {rule && <Chip color="#EEEAE0" soft="#12141F">{rule.id} · {rule.title}</Chip>}
          </span>
          <span className="mt-1 text-sm font-semibold text-ink-2">{c.simple}</span>
          {c.severity !== 'green' && <span className="mt-1 text-[13px] font-bold" style={{ color: s.text }}>{c.reason}</span>}
        </span>
        <ChevronRight size={18} className={`mt-2 shrink-0 text-muted transition ${open ? 'rotate-90' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="relative overflow-hidden">
            <div className="grid gap-3 px-4 pb-4 pl-[68px] md:grid-cols-2">
              <div className="paper-doc rounded-xl p-3.5 font-serif text-[16px] leading-snug">
                <span className="mb-1 flex items-center gap-1 font-sans text-[10px] font-extrabold uppercase tracking-[0.16em] text-black/45"><Quote size={11} /> The document says</span>
                {c.text}
              </div>
              {rule && (
                <div className="rounded-xl bg-ink p-3.5 text-[13px] font-semibold leading-relaxed text-white/85">
                  <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.16em] text-glow-money">Rule {rule.id} · benchmark</span>
                  {rule.benchmark}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function ClauseList({ analysis, active, onSpy }) {
  const [filter, setFilter] = useState('all')
  const rules = Object.fromEntries(analysis.rules.map((r) => [r.id, r]))
  const shown = analysis.clauses.filter((c) => filter === 'all' || c.severity === filter || active.clauseIds.includes(c.id))

  return (
    <Card className="lg:col-span-12">
      <CardHead
        title="Clause by clause, in plain words"
        right={
          <div className="flex rounded-full bg-paper p-1 text-xs font-extrabold">
            {FILTERS.map((f) => (
              <button type="button" key={f.key} onClick={() => setFilter(f.key)} className="relative cursor-pointer rounded-full px-3 py-1.5">
                {filter === f.key && <motion.span layoutId="filter" className="absolute inset-0 rounded-full bg-ink" />}
                <span className={`relative ${filter === f.key ? 'text-white' : 'text-muted'}`}>{f.label}</span>
              </button>
            ))}
          </div>
        }
      />
      <div className="flex flex-col gap-2.5">
        <AnimatePresence mode="popLayout">
          {shown.map((c) => <ClauseCard key={c.id} c={c} rule={rules[c.rule_id]} active={active.clauseIds.includes(c.id)} first={active.clauseIds[0] === c.id} activeT={active.t} onSpy={onSpy} />)}
        </AnimatePresence>
      </div>

      {analysis.missing.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-info">Missing from your document</p>
          <div className="grid gap-3 md:grid-cols-3">
            {analysis.missing.map((m, i) => (
              <motion.div
                key={m.category}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, ease: EASE }}
                className="relative rounded-2xl border-2 border-dashed border-info/40 bg-info-soft p-4"
              >
                <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-info text-white"><Plus size={14} /></span>
                <p className="pr-8 text-[15px] font-extrabold text-[#2D4670]">{m.label}</p>
                <p className="mt-1 text-[13px] font-semibold text-[#2D4670]/80">{m.why}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
