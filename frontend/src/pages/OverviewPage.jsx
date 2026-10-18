import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, CalendarClock, FileText, Handshake, Info, Link2, Mic } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import HelpCard from '../components/HelpCard'
import KeyStats from '../components/KeyStats'
import { EASE } from '../components/motion-bits'
import ScorePanel from '../components/ScorePanel'
import { useStore } from '../lib/store'
import { SEVERITY } from '../lib/theme'
import { hasTimeline, PageHead } from './ReportLayout'

export default function OverviewPage() {
  const { analysis, focus } = useStore()
  const navigate = useNavigate()
  const reds = analysis.clauses.filter((c) => c.severity === 'red')
  const cited = analysis.clauses.filter((c) => c.rule_id && c.severity !== 'green').length

  const openClause = (c) => {
    focus([c.id], c.rule_id ? [c.rule_id] : [])
    navigate('/report/clauses')
  }

  const explore = [
    { to: '/report/clauses', icon: FileText, title: 'Clause by clause', stat: `${analysis.clauses.length} clauses`, text: 'Every clause in plain words, next to the original text.' },
    { to: '/report/proof', icon: Link2, title: 'The proof', stat: `${cited} citations`, text: 'How each flag was reached, wired to a written rule.' },
    hasTimeline(analysis) && { to: '/report/timeline', icon: CalendarClock, title: 'Month by month', stat: `${analysis.key_values.term_months || ''} months`, text: 'Key dates, risks and what leaving early costs.' },
    { to: '/report/ask', icon: Mic, title: 'Ask by voice', stat: '5 languages', text: 'Ask a question and hear the answer, with the clause it came from.' },
    { to: '/report/negotiate', icon: Handshake, title: 'Negotiate', stat: `${reds.length} requests`, text: 'A polite message that asks for the unfair terms to change.' },
  ].filter(Boolean)

  return (
    <>
      <PageHead
        kicker={['01', 'Overview']}
        title={reds.length ? `${reds.length} clauses work against you.` : 'Your agreement looks fair.'}
        accent="Here’s the proof."
      />
      {analysis.notice && (
        <p role="status" className="mb-5 flex items-center gap-2 rounded-2xl bg-info-soft px-4 py-2.5 text-sm font-bold text-[#2C4466]">
          <Info size={15} /> {analysis.notice}
        </p>
      )}

      {(analysis.score < 50 || analysis.counts.red >= 3) && (
        <div className="mb-5">
          <HelpCard highStakes reason={`This document scores ${analysis.score}/100 with ${analysis.counts.red} clauses against the law.`} />
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-12 [&>*]:min-w-0">
        <ScorePanel analysis={analysis} />
        <KeyStats analysis={analysis} onFocus={(ids, rules) => { focus(ids, rules); navigate('/report/clauses') }} />
      </div>

      {reds.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-extrabold tracking-[-0.03em]">Fix these first</h2>
            <Link to="/report/clauses" className="flex items-center gap-1 text-sm font-extrabold text-muted hover:text-ink">All clauses <ArrowRight size={14} /></Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2 [&>*]:min-w-0">
            {reds.map((c, i) => (
              <motion.button
                type="button"
                key={c.id}
                onClick={() => openClause(c)}
                initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
                whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.6, ease: EASE, delay: i * 0.08 }}
                whileHover={{ y: -3 }}
                className="group flex cursor-pointer items-start gap-4 rounded-[20px] bg-surface p-5 text-left shadow-[0_1px_2px_rgba(20,20,20,0.05)] transition hover:shadow-md"
              >
                <span className="num flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold" style={{ background: SEVERITY.red.soft, color: SEVERITY.red.text }}>{c.number}</span>
                <span className="flex flex-1 flex-col">
                  <span className="flex items-center gap-2 text-[15px] font-extrabold">
                    {c.title}
                    <span className="num rounded-full bg-ink px-2 py-0.5 text-[10px] font-extrabold text-glow-money">{c.rule_id}</span>
                  </span>
                  <span className="mt-1 text-sm font-semibold text-ink-2">{c.reason}</span>
                </span>
                <ArrowUpRight size={18} className="mt-1 shrink-0 text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
              </motion.button>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-4 font-display text-2xl font-extrabold tracking-[-0.03em]">Go deeper</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 [&>*]:min-w-0">
          {explore.map((e, i) => (
            <motion.div
              key={e.to}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, ease: EASE, delay: i * 0.07 }}
            >
              <Link to={e.to} className="group flex h-full flex-col justify-between gap-6 rounded-[20px] bg-surface p-5 shadow-[0_1px_2px_rgba(20,20,20,0.05)] transition hover:-translate-y-1 hover:bg-ink hover:text-white hover:shadow-xl">
                <span className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-paper text-ink transition group-hover:bg-white/10 group-hover:text-glow-heat"><e.icon size={19} /></span>
                  <span className="num text-xs font-extrabold text-muted group-hover:text-white/60">{e.stat}</span>
                </span>
                <span>
                  <span className="flex items-center justify-between text-[15px] font-extrabold">{e.title}<ArrowRight size={16} className="opacity-0 transition group-hover:opacity-100" /></span>
                  <span className="mt-1 block text-[13px] font-semibold leading-snug text-muted group-hover:text-white/65">{e.text}</span>
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </>
  )
}
