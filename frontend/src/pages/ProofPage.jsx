import { motion } from 'framer-motion'
import AgentFeed from '../components/AgentFeed'
import BenchmarkBars from '../components/BenchmarkBars'
import CitationWeb from '../components/CitationWeb'
import { CountTo, EASE } from '../components/motion-bits'
import { AGENTS, PIPELINE } from '../lib/agents'
import { useStore } from '../lib/store'
import { PageHead } from './ReportLayout'

export default function ProofPage() {
  const { analysis, active, focus } = useStore()
  const flagged = analysis.clauses.filter((c) => c.severity !== 'green').length
  const cited = analysis.clauses.filter((c) => c.rule_id && c.severity !== 'green').length
  const verified = analysis.trace.find((t) => t.from === 'Verifier')?.text ?? ''
  const stats = {
    Reader: [analysis.clauses.length, 'clauses read'],
    'Law Checker': [flagged, 'clauses flagged'],
    'Gap Finder': [analysis.missing.length, 'missing clauses'],
    Verifier: [cited, 'citations checked'],
  }

  return (
    <>
      <PageHead
        kicker={['03', 'Proof']}
        title="Four checks."
        accent="Every flag cited."
        sub="Each stage hands its findings to the next. Nothing reaches you unless it points to a clause and a written rule."
      />

      <PipelineStrip stats={stats} />
      <p className="mb-8 mt-3 text-sm font-semibold text-muted">{verified}</p>

      <div className="grid gap-5 lg:grid-cols-12">
        <AgentFeed analysis={analysis} onFocus={focus} />
        <BenchmarkBars analysis={analysis} active={active} onFocus={focus} />
        <CitationWeb analysis={analysis} active={active} onFocus={focus} />
      </div>
    </>
  )
}

// The four pipeline stages left to right, with packets of findings travelling between them.
function PipelineStrip({ stats }) {
  return (
    <div className="relative overflow-hidden rounded-[24px] bg-night p-5 text-night-text sm:p-7">
      <div className="pointer-events-none absolute -left-10 -top-20 h-60 w-60 rounded-full bg-glow-heat/15 blur-[80px]" />
      <div className="relative grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="absolute left-[12%] right-[12%] top-[34px] hidden h-px bg-white/15 md:block" />
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute top-[31px] hidden h-1.5 w-1.5 rounded-full bg-glow-heat shadow-[0_0_10px_#E9E5DC] md:block"
            animate={{ left: [`${12 + i * 25.3}%`, `${12 + (i + 1) * 25.3}%`], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.55, ease: 'easeInOut' }}
          />
        ))}
        {PIPELINE.map((name, i) => {
          const a = AGENTS[name]
          const [n, label] = stats[name]
          return (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.15 + i * 0.12 }}
              className="relative flex flex-col items-center text-center"
            >
              <span className="relative flex h-[68px] w-[68px] items-center justify-center rounded-2xl border border-night-line bg-night-2" style={{ color: a.color }}>
                <a.icon size={26} />
              </span>
              <span className="mt-3 text-[15px] font-extrabold">{name}</span>
              <span className="text-xs font-bold text-night-muted">{a.role.split(' · ')[0]}</span>
              <span className="num mt-2 text-3xl font-extrabold" style={{ color: a.color }}><CountTo to={n} onMount delay={0.4 + i * 0.15} duration={1} /></span>
              <span className="text-xs font-bold text-night-muted">{label}</span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
