import { motion } from 'framer-motion'
import { Info, RotateCcw } from 'lucide-react'
import AgentFeed from './AgentFeed'
import BenchmarkBars from './BenchmarkBars'
import CitationWeb from './CitationWeb'
import ClauseList from './ClauseList'
import KeyStats from './KeyStats'
import MoneySimulator from './MoneySimulator'
import { Words } from './motion-bits'
import ScorePanel from './ScorePanel'
import Timeline from './Timeline'
import { Logo } from './ui'
import VoicePanel from './VoicePanel'

export default function Dashboard({ analysis, health, lang, setLang, active, onFocus, onReset, onNegotiate }) {
  const live = analysis.source === 'gemma'
  const reds = analysis.counts.red
  return (
    <motion.div key="dash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between px-4 sm:px-6">
          <button type="button" onClick={onReset} className="cursor-pointer" aria-label="Back to start"><Logo /></button>
          <div className="flex items-center gap-2">
            <span className={`hidden h-9 items-center gap-2 rounded-full px-3 text-xs font-extrabold sm:flex ${live ? 'bg-money-soft text-[#174F3D]' : 'bg-surface text-muted'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-money' : 'bg-muted'}`} />
              {live ? `Live · ${health?.model || 'Gemma 4'}` : 'Demo mode · cached analysis'}
            </span>
            <button type="button" onClick={onReset} className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-extrabold hover:border-ink/30">
              <RotateCcw size={15} /> New scan
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1480px] gap-5 px-4 py-6 sm:px-6 lg:py-8 xl:grid-cols-[1fr_400px]">
        <main className="flex min-w-0 flex-col gap-5">
          <div>
            <p className="text-sm font-bold text-muted">{analysis.title} · {analysis.clauses.length} clauses read</p>
            <h1 className="mt-1 font-display text-[clamp(32px,4.4vw,52px)] font-extrabold leading-[1.05] tracking-[-0.04em]">
              <Words text={reds ? `${reds} clauses work against you.` : 'Your agreement looks fair.'} />{' '}
              <span className="font-serif font-normal italic text-heat"><Words text="Here’s the proof." delay={0.25} /></span>
            </h1>
          </div>

          {analysis.notice && (
            <p role="status" className="flex items-center gap-2 rounded-2xl bg-info-soft px-4 py-2.5 text-sm font-bold text-[#2D4670]">
              <Info size={15} /> {analysis.notice}
            </p>
          )}

          <div className="grid gap-5 lg:grid-cols-12">
            <ScorePanel analysis={analysis} />
            <KeyStats analysis={analysis} onFocus={onFocus} />
            <AgentFeed analysis={analysis} onFocus={onFocus} />
            <BenchmarkBars analysis={analysis} active={active} onFocus={onFocus} />
            <CitationWeb analysis={analysis} active={active} onFocus={onFocus} />
            <Timeline analysis={analysis} onFocus={onFocus} />
            <MoneySimulator analysis={analysis} onFocus={onFocus} />
            <ClauseList analysis={analysis} active={active} />
          </div>
          <p className="text-center text-xs font-semibold text-muted">
            Clausewise explains documents; it is not legal advice. For help with your case, call the free legal aid helpline 15100 (NALSA).
          </p>
        </main>

        <aside className="xl:sticky xl:top-[88px] xl:h-[calc(100vh-112px)]">
          <VoicePanel analysis={analysis} lang={lang} setLang={setLang} health={health} onCite={onFocus} onNegotiate={onNegotiate} />
        </aside>
      </div>
    </motion.div>
  )
}
