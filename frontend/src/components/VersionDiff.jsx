import { motion } from 'framer-motion'
import { ArrowRight, GitCompare, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { SEVERITY } from '../lib/theme'
import { EASE } from './motion-bits'
import { Chip } from './ui'

const RANK = { green: 0, amber: 1, red: 2 }

// Word-level diff (longest common subsequence): returns [{type: 'same'|'add'|'del', text}].
function diffWords(a, b) {
  const x = a.split(/\s+/).filter(Boolean)
  const y = b.split(/\s+/).filter(Boolean)
  const dp = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0))
  for (let i = x.length - 1; i >= 0; i--)
    for (let j = y.length - 1; j >= 0; j--)
      dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const out = []
  let i = 0
  let j = 0
  const push = (type, text) => (out.at(-1)?.type === type ? (out.at(-1).text += ' ' + text) : out.push({ type, text }))
  while (i < x.length && j < y.length) {
    if (x[i] === y[j]) { push('same', x[i]); i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) push('del', x[i++])
    else push('add', y[j++])
  }
  while (i < x.length) push('del', x[i++])
  while (j < y.length) push('add', y[j++])
  return out
}

function compare(from, to) {
  const before = Object.fromEntries(from.clauses.map((c) => [String(c.number), c]))
  const after = Object.fromEntries(to.clauses.map((c) => [String(c.number), c]))
  const numbers = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort((p, q) => Number(p) - Number(q))
  return numbers.map((n) => {
    const a = before[n]
    const b = after[n]
    if (!a) return { n, kind: 'added', b }
    if (!b) return { n, kind: 'removed', a }
    const reworded = a.text.trim() !== b.text.trim()
    const delta = RANK[b.severity] - RANK[a.severity]
    const kind = delta < 0 ? 'fixed' : delta > 0 ? 'worse' : reworded ? 'reworded' : 'same'
    return { n, kind, a, b, words: reworded ? diffWords(a.text, b.text) : null }
  })
}

const KIND = {
  fixed: { label: 'Fixed', color: '#2F6B4F', soft: '#E5EFE8' },
  worse: { label: 'Got worse', color: '#9A2E3A', soft: '#F5E3E5' },
  reworded: { label: 'Reworded', color: '#3D5A80', soft: '#E5EAF2' },
  added: { label: 'Added', color: '#A8771E', soft: '#F6EEDB' },
  removed: { label: 'Removed', color: '#6E6C67', soft: '#EFEDE7' },
}

export default function VersionDiff({ versions }) {
  const [fromI, setFrom] = useState(0)
  const [toI, setTo] = useState(versions.length - 1)
  const rows = compare(versions[fromI].analysis, versions[toI].analysis)
  const changed = rows.filter((r) => r.kind !== 'same')
  const tally = Object.keys(KIND).map((k) => [k, rows.filter((r) => r.kind === k).length]).filter(([, n]) => n)
  const picker = (value, set) => (
    <select value={value} onChange={(e) => set(Number(e.target.value))} className="h-9 cursor-pointer rounded-full border border-line bg-surface px-3 text-xs font-extrabold outline-none">
      {versions.map((v, i) => <option key={i} value={i}>{v.label} · {v.score}/100</option>)}
    </select>
  )

  return (
    <section className="mt-5 rounded-[24px] bg-surface p-5 shadow-[0_1px_2px_rgba(20,20,20,0.05)] sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 text-[15px] font-extrabold"><GitCompare size={17} /> What changed between versions</span>
        <span className="ml-auto flex items-center gap-2">{picker(fromI, setFrom)}<ArrowRight size={14} className="text-muted" />{picker(toI, setTo)}</span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {tally.length === 0 && <span className="text-sm font-semibold text-muted">These two versions are the same.</span>}
        {tally.map(([k, n]) => (
          <motion.span key={k} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="num rounded-full px-3 py-1.5 text-xs font-extrabold" style={{ background: KIND[k].soft, color: KIND[k].color }}>
            {n} {KIND[k].label.toLowerCase()}
          </motion.span>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        {changed.map((r, i) => {
          const k = KIND[r.kind]
          return (
            <motion.div
              key={`${fromI}-${toI}-${r.n}`}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, ease: EASE, delay: Math.min(i, 6) * 0.05 }}
              className="rounded-2xl border p-4"
              style={{ borderColor: k.color + '40', background: r.kind === 'worse' ? k.soft + '90' : undefined }}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2 text-sm font-extrabold">
                Clause {r.n} · {(r.b || r.a).title}
                <span className="rounded-full px-2.5 py-0.5 text-[11px]" style={{ background: k.soft, color: k.color }}>{k.label}</span>
                {r.a && r.b && r.a.severity !== r.b.severity && (
                  <span className="flex items-center gap-1.5">
                    <Chip color={SEVERITY[r.a.severity].text} soft={SEVERITY[r.a.severity].soft}>{SEVERITY[r.a.severity].short}</Chip>
                    <ArrowRight size={12} />
                    <Chip color={SEVERITY[r.b.severity].text} soft={SEVERITY[r.b.severity].soft}>{SEVERITY[r.b.severity].short}</Chip>
                  </span>
                )}
              </div>
              {r.kind === 'worse' && (
                <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-danger"><TriangleAlert size={13} /> Watch out: this clause changed against you. {r.b.reason}</p>
              )}
              <p className="font-serif text-[15px] leading-relaxed">
                {r.words
                  ? r.words.map((w, wi) => (
                    <span key={wi} className={w.type === 'del' ? 'rounded bg-danger-soft px-0.5 text-danger line-through' : w.type === 'add' ? 'rounded bg-money-soft px-0.5 text-money' : ''}>{w.text} </span>
                  ))
                  : r.kind === 'removed'
                    ? <span className="rounded bg-danger-soft px-0.5 text-danger line-through">{r.a.text}</span>
                    : r.kind === 'added'
                      ? <span className="rounded bg-money-soft px-0.5 text-money">{r.b.text}</span>
                      : r.b.text}
              </p>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
