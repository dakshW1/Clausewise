import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef, useState } from 'react'
import { SEVERITY } from '../lib/theme'
import { Card, CardHead } from './ui'

const ROW = 54
const NODE_H = 42
const LW = 230
const RX = 410
const RW = 230
const W = 640

// Every flagged clause is wired to the rule it was checked against. Pulses travel along each wire.
export default function CitationWeb({ analysis, active, onFocus }) {
  const [hover, setHover] = useState(null)
  const left = analysis.clauses.filter((c) => c.severity !== 'green' && c.rule_id)
  const right = analysis.rules
  const H = Math.max(left.length, right.length) * ROW + 8
  const ly = (i) => (H - left.length * ROW) / 2 + i * ROW + ROW / 2
  const ry = (i) => (H - right.length * ROW) / 2 + i * ROW + ROW / 2
  const ruleIndex = Object.fromEntries(right.map((r, i) => [r.id, i]))
  const cited = new Set(left.map((c) => c.rule_id))

  // Wires draw in step with scrolling: from the moment the card enters until it reaches the middle of the screen.
  const box = useRef(null)
  const { scrollYProgress } = useScroll({ target: box, offset: ['start end', 'center center'] })
  const lit = hover || (active.clauseIds.length ? active : null)
  const clauseOn = (c) => !lit || lit.clauseIds.includes(c.id) || lit.ruleIds.includes(c.rule_id)
  const ruleOn = (r) => cited.has(r.id) && (!lit || lit.ruleIds.includes(r.id) || left.some((c) => c.rule_id === r.id && lit.clauseIds.includes(c.id)))

  return (
    <Card className="lg:col-span-12">
      <CardHead title="Every flag is wired to a written rule" sub="tap or hover a clause to trace it" />
      {/* Phones: the same links as a stacked list, since the wide diagram would be unreadably small. */}
      <div className="flex flex-col gap-3 sm:hidden">
        {left.map((c, i) => {
          const s = SEVERITY[c.severity]
          const rule = right.find((r) => r.id === c.rule_id)
          return (
            <motion.button
              type="button"
              key={c.id}
              onClick={() => onFocus([c.id], [c.rule_id])}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.45, delay: Math.min(i, 4) * 0.05 }}
              className="flex cursor-pointer flex-col items-stretch text-left"
            >
              <span className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: s.soft }}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="text-sm font-extrabold">Clause {c.number}</span>
                <span className="truncate text-xs font-semibold text-muted">{c.title}</span>
              </span>
              <span className="relative ml-5 h-5 w-[2px] overflow-hidden" style={{ background: s.color + '33' }}>
                <motion.span className="absolute inset-x-0 top-0 block" style={{ background: s.color }} initial={{ height: 0 }} whileInView={{ height: '100%' }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.2 }} />
              </span>
              <span className="flex items-center gap-2 rounded-xl bg-ink px-3 py-2.5 text-white">
                <span className="num text-sm font-extrabold text-glow-money">{c.rule_id}</span>
                <span className="truncate text-xs font-semibold text-white/75">{rule?.title}</span>
              </span>
            </motion.button>
          )
        })}
      </div>
      <div className="mb-2 hidden justify-between px-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted sm:flex">
        <span>Your clauses</span>
        <span>The rulebook</span>
      </div>
      <svg ref={box} viewBox={`0 0 ${W} ${H}`} className="hidden w-full sm:block" role="img" aria-label="Clauses linked to the rules they break">
        {left.map((c, i) => {
          const y1 = ly(i)
          const y2 = ry(ruleIndex[c.rule_id])
          const d = `M${LW} ${y1} C${LW + 100} ${y1}, ${RX - 100} ${y2}, ${RX} ${y2}`
          const color = SEVERITY[c.severity].color
          const on = clauseOn(c)
          return (
            <g key={c.id} opacity={on ? 1 : 0.12} style={{ transition: 'opacity .3s' }}>
              <Wire d={d} color={color} width={lit && on ? 2.6 : 1.6} progress={scrollYProgress} index={i} total={left.length} />
              <circle r="3.5" fill={color}>
                <animateMotion dur={`${2 + (i % 3) * 0.4}s`} repeatCount="indefinite" path={d} begin={`${1.5 + i * 0.2}s`} />
              </circle>
            </g>
          )
        })}

        {left.map((c, i) => {
          const y = ly(i)
          const s = SEVERITY[c.severity]
          return (
            <motion.g
              key={c.id}
              initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: clauseOn(c) ? 1 : 0.35, x: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              onMouseEnter={() => setHover({ clauseIds: [c.id], ruleIds: [c.rule_id] })}
              onMouseLeave={() => setHover(null)}
              onClick={() => onFocus([c.id], [c.rule_id])}
              style={{ cursor: 'pointer' }}
            >
              <rect x="0" y={y - NODE_H / 2} width={LW} height={NODE_H} rx="14" fill={s.soft} />
              <circle cx="20" cy={y} r="5" fill={s.color} />
              <text x="34" y={y - 3} fill="#141414" fontSize="13" fontWeight="800">Clause {c.number}</text>
              <text x="34" y={y + 13} fill="#6E6C67" fontSize="11.5" fontWeight="600">{c.title}</text>
              <circle cx={LW} cy={y} r="4" fill={s.color} />
            </motion.g>
          )
        })}

        {right.map((r, i) => {
          const y = ry(i)
          const isCited = cited.has(r.id)
          return (
            <motion.g
              key={r.id}
              initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: !isCited ? 0.35 : ruleOn(r) ? 1 : 0.35, x: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              onMouseEnter={() => isCited && setHover({ clauseIds: left.filter((c) => c.rule_id === r.id).map((c) => c.id), ruleIds: [r.id] })}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: isCited ? 'pointer' : 'default' }}
            >
              <rect x={RX} y={y - NODE_H / 2} width={RW} height={NODE_H} rx="14" fill={isCited ? '#141414' : '#F4F3EF'} />
              <circle cx={RX} cy={y} r="4" fill={isCited ? '#141414' : '#D6D3CB'} />
              <text x={RX + 16} y={y - 3} fill={isCited ? '#8FCBA8' : '#6E6C67'} fontSize="13" fontWeight="800" className="num">{r.id}</text>
              <text x={RX + 16} y={y + 13} fill={isCited ? 'rgba(255,255,255,0.75)' : '#6E6C67'} fontSize="11.5" fontWeight="600">{r.title}</text>
            </motion.g>
          )
        })}
      </svg>
      <p className="mt-3 text-xs font-semibold text-muted">{analysis.rules_source}</p>
    </Card>
  )
}

function Wire({ d, color, width, progress, index, total }) {
  const start = (index / Math.max(total, 1)) * 0.5
  const pathLength = useTransform(progress, [start, start + 0.5], [0, 1])
  return <motion.path d={d} fill="none" stroke={color} strokeWidth={width} style={{ pathLength }} />
}
