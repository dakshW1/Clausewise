import { AnimatePresence, motion } from 'framer-motion'
import { Quote, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { EASE } from '../components/motion-bits'
import { Chip } from '../components/ui'
import VoicePanel from '../components/VoicePanel'
import { useStore } from '../lib/store'
import { SEVERITY } from '../lib/theme'
import { PageHead } from './ReportLayout'

export default function AskPage() {
  const { analysis, lang, setLang, health, active, focus } = useStore()
  const navigate = useNavigate()
  const rules = Object.fromEntries(analysis.rules.map((r) => [r.id, r]))
  const cited = active.clauseIds.map((id) => analysis.clauses.find((c) => c.id === id)).filter(Boolean)

  return (
    <>
      <PageHead kicker={['05', 'Ask']} title="Ask in your language." accent="See the proof." />
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="h-[min(720px,calc(100vh-220px))] min-h-[560px] lg:col-span-7">
          <VoicePanel analysis={analysis} lang={lang} setLang={setLang} health={health} onCite={focus} onNegotiate={() => navigate('/report/negotiate')} />
        </div>
        <aside className="lg:col-span-5">
          <div className="rounded-[24px] bg-surface p-5 shadow-[0_1px_2px_rgba(18,20,31,0.05)] sm:p-6">
            <div className="mb-4 flex items-center gap-2 text-[15px] font-extrabold"><ShieldCheck size={17} className="text-money" /> Proof behind the answer</div>
            <AnimatePresence mode="popLayout">
              {cited.length === 0 ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-8 text-center">
                  <div className="relative h-28 w-48">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="absolute left-1/2 h-20 w-36 rounded-2xl border border-line bg-paper"
                        style={{ x: '-50%', top: i * 8, zIndex: 3 - i, scale: 1 - i * 0.06 }}
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
                      >
                        {i === 0 && <span className="m-3 block h-2 w-20 rounded-full bg-line" />}
                        {i === 0 && <span className="mx-3 block h-2 w-14 rounded-full bg-line" />}
                      </motion.div>
                    ))}
                  </div>
                  <p className="mt-4 max-w-xs text-sm font-semibold text-muted">Ask a question. The clauses and rules behind the answer will appear here, so you can check it yourself.</p>
                </motion.div>
              ) : (
                cited.map((c, i) => {
                  const s = SEVERITY[c.severity]
                  const rule = rules[c.rule_id]
                  return (
                    <motion.div
                      key={`${c.id}-${active.t}`}
                      initial={{ opacity: 0, x: 30, filter: 'blur(8px)' }}
                      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.55, ease: EASE, delay: i * 0.12 }}
                      className="mb-4 last:mb-0"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="num flex h-8 w-8 items-center justify-center rounded-lg text-sm font-extrabold" style={{ background: s.soft, color: s.text }}>{c.number}</span>
                        <span className="text-[15px] font-extrabold">{c.title}</span>
                        <Chip color={s.text} soft={s.soft}>{s.label}</Chip>
                      </div>
                      <div className="paper-doc rounded-xl p-3.5 font-serif text-[16px] leading-snug">
                        <span className="mb-1 flex items-center gap-1 font-sans text-[10px] font-extrabold uppercase tracking-[0.16em] text-black/45"><Quote size={11} /> Your agreement says</span>
                        {c.text}
                      </div>
                      {rule && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.12 }} className="mt-2 rounded-xl bg-ink p-3.5 text-[13px] font-semibold leading-relaxed text-white/85">
                          <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.16em] text-glow-money">Rule {rule.id} · {rule.title}</span>
                          {rule.benchmark}
                        </motion.div>
                      )}
                    </motion.div>
                  )
                })
              )}
            </AnimatePresence>
          </div>
        </aside>
      </div>
    </>
  )
}
