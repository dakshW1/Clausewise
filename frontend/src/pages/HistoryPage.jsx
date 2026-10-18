import { motion } from 'framer-motion'
import { ArrowRight, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CountTo, EASE, Kicker, Reveal, Words } from '../components/motion-bits'
import { Logo } from '../components/ui'
import { api } from '../lib/api'
import { DOC_ICONS } from './SamplesPage'

export const OUTCOME = {
  agreed: { label: 'Agreed', color: '#2F6B4F', soft: '#E5EFE8' },
  partly: { label: 'Partly', color: '#A8771E', soft: '#F6EEDB' },
  refused: { label: 'Refused', color: '#9A2E3A', soft: '#F5E3E5' },
  pending: { label: 'Pending', color: '#8F8D88', soft: '#EFEDE7' },
}

export const STATUS = {
  reviewing: { label: 'Reviewing', color: '#3D5A80', soft: '#E5EAF2' },
  negotiating: { label: 'Negotiating', color: '#6E4E12', soft: '#F6EEDB' },
  signed: { label: 'Signed', color: '#23513C', soft: '#E5EFE8' },
  walked_away: { label: 'Walked away', color: '#6E6C67', soft: '#EFEDE7' },
}

export function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  const d = Math.round(s / 86400)
  return d === 1 ? 'yesterday' : `${d} days ago`
}

const FILTERS = [['all', 'All'], ['negotiating', 'Negotiating'], ['signed', 'Signed'], ['reviewing', 'Reviewing']]

export default function HistoryPage() {
  const [cases, setCases] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    api.cases().then(setCases).catch(() => setCases([]))
  }, [])

  const list = cases ?? []
  const shown = list.filter((c) => filter === 'all' || c.status === filter)
  const won = list.reduce((n, c) => n + c.outcomes.agreed + c.outcomes.partly, 0)
  const revised = list.filter((c) => c.scores.length > 1)
  const lift = revised.length ? Math.round(revised.reduce((n, c) => n + (c.scores.at(-1).score - c.scores[0].score), 0) / revised.length) : 0
  const stats = [
    [list.length, 'documents checked'],
    [won, 'clauses changed in your favour'],
    [lift, 'average score gain after revising', '+'],
    [list.filter((c) => c.status === 'signed').length, 'signed with confidence'],
  ]

  return (
    <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, filter: 'blur(8px)' }} className="min-h-screen bg-paper">
      <section className="grain relative overflow-hidden bg-night pb-14 text-night-text">
        <div className="pointer-events-none absolute -right-24 -top-24 h-[26rem] w-[26rem] rounded-full bg-glow-heat/15 blur-[110px]" />
        <header className="relative z-10 mx-auto flex h-18 max-w-[1240px] items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="Clausewise home"><Logo dark /></Link>
          <Link to="/samples" className="flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-extrabold text-ink transition hover:bg-white/90"><Plus size={16} /> Check a document</Link>
        </header>
        <div className="relative z-10 mx-auto max-w-[1240px] px-4 pt-10 sm:px-6">
          <Kicker n="··">Your history</Kicker>
          <h1 className="font-display text-[clamp(38px,6vw,88px)] font-extrabold leading-[0.92] tracking-[-0.045em]">
            <Words text="Every document." />
            <br />
            <span className="font-serif font-normal italic text-glow-heat"><Words text="Every clause you won." delay={0.2} /></span>
          </h1>
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
            {stats.map(([n, label, prefix], i) => (
              <Reveal key={label} delay={0.2 + i * 0.08} y={20} className="rounded-2xl border border-night-line bg-night-2/80 p-4 backdrop-blur">
                <span className="num block text-[40px] font-extrabold leading-none tracking-[-0.03em] text-glow-money">
                  {cases ? <CountTo to={n} prefix={prefix && n > 0 ? prefix : ''} onMount delay={0.3 + i * 0.1} duration={1.2} /> : '–'}
                </span>
                <span className="mt-2 block text-xs font-bold text-night-muted">{label}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6">
        <div className="mb-5 flex flex-wrap gap-1 rounded-full bg-surface p-1 text-sm font-extrabold shadow-[0_1px_2px_rgba(20,20,20,0.05)] sm:w-fit">
          {FILTERS.map(([k, label]) => (
            <button type="button" key={k} onClick={() => setFilter(k)} className="relative cursor-pointer rounded-full px-4 py-2">
              {filter === k && <motion.span layoutId="history-filter" className="absolute inset-0 rounded-full bg-ink" />}
              <span className={`relative ${filter === k ? 'text-white' : 'text-muted'}`}>{label}</span>
            </button>
          ))}
        </div>

        {cases && shown.length === 0 && (
          <p className="rounded-[24px] bg-surface p-10 text-center font-semibold text-muted">Nothing here yet. Check a document and it will appear in your history.</p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {shown.map((c, i) => <CaseCard key={c.id} c={c} index={i} />)}
        </div>
      </main>
    </motion.div>
  )
}

function CaseCard({ c, index }) {
  const Icon = DOC_ICONS[c.doc_type] || DOC_ICONS.general
  const st = STATUS[c.status] || STATUS.reviewing
  const first = c.scores[0]?.score ?? 0
  const last = c.scores.at(-1)?.score ?? first
  const total = Object.values(c.outcomes).reduce((a, b) => a + b, 0) || 1
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, ease: EASE, delay: (index % 2) * 0.08 }}
    >
      <Link to={`/history/${c.id}`} className="group flex h-full flex-col gap-5 rounded-[24px] bg-surface p-5 shadow-[0_1px_2px_rgba(20,20,20,0.05)] transition hover:-translate-y-1 hover:shadow-xl sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-paper"><Icon size={20} /></span>
          <span className="flex flex-1 flex-col">
            <span className="text-[15px] font-extrabold leading-snug">{c.title}</span>
            <span className="text-xs font-bold text-muted">{c.doc_label} · updated {timeAgo(c.updated_at)}{c.example ? ' · example' : ''}</span>
          </span>
          <span className="shrink-0 rounded-full px-3 py-1 text-[11px] font-extrabold" style={{ background: st.soft, color: st.color }}>{st.label}</span>
        </div>

        <div className="flex items-end gap-5">
          <div>
            <span className="block text-xs font-bold text-muted">Fairness</span>
            <span className="num text-[34px] font-extrabold leading-none tracking-[-0.03em]">
              {c.scores.length > 1 ? <><span className="text-muted">{first}</span><span className="mx-1 text-xl text-muted">→</span><span className="text-money">{last}</span></> : last}
            </span>
          </div>
          <ScoreLine scores={c.scores.map((s) => s.score)} />
        </div>

        <div>
          <div className="mb-2 flex justify-between text-xs font-bold text-muted">
            <span>Flagged clauses</span>
            <span>{c.outcomes.agreed + c.outcomes.partly} of {total} changed</span>
          </div>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-paper">
            {['agreed', 'partly', 'refused', 'pending'].map((k, i) => (
              <motion.span
                key={k}
                className="block h-full"
                style={{ background: OUTCOME[k].color }}
                initial={{ width: 0 }}
                whileInView={{ width: `${(c.outcomes[k] / total) * 100}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: EASE, delay: 0.2 + i * 0.1 }}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-bold text-muted">
            {['agreed', 'partly', 'refused', 'pending'].filter((k) => c.outcomes[k]).map((k) => (
              <span key={k} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: OUTCOME[k].color }} />{c.outcomes[k]} {OUTCOME[k].label.toLowerCase()}</span>
            ))}
          </div>
        </div>
        <span className="mt-auto flex items-center gap-1 text-sm font-extrabold text-muted transition group-hover:text-ink">Open the case <ArrowRight size={15} className="transition group-hover:translate-x-0.5" /></span>
      </Link>
    </motion.div>
  )
}

// A small line through each version's score; it draws itself when it scrolls into view.
function ScoreLine({ scores }) {
  const w = 160
  const h = 48
  const pts = scores.length > 1 ? scores : [scores[0] ?? 0, scores[0] ?? 0]
  const x = (i) => 6 + (i / (pts.length - 1)) * (w - 12)
  const y = (s) => h - 6 - (s / 100) * (h - 12)
  const d = pts.map((s, i) => `${i ? 'L' : 'M'}${x(i)} ${y(s)}`).join(' ')
  const up = pts.at(-1) >= pts[0]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-12 flex-1" aria-hidden="true">
      <line x1="0" x2={w} y1={y(75)} y2={y(75)} stroke="#E4E1DA" strokeDasharray="3 4" />
      <motion.path d={d} fill="none" stroke={scores.length > 1 && up ? '#2F6B4F' : '#8F8D88'} strokeWidth="2.5" strokeLinecap="round"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.1, ease: EASE, delay: 0.3 }} />
      {pts.map((s, i) => (scores.length > 1 || i === 0) && (
        <motion.circle key={i} cx={x(i)} cy={y(s)} r="4" fill={i === pts.length - 1 && scores.length > 1 ? '#2F6B4F' : '#141414'}
          initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.4 }} />
      ))}
    </svg>
  )
}
