import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AGENTS } from '../lib/agents'
import { SEVERITY } from '../lib/theme'
import { EASE } from './motion-bits'
import { Card, CardHead } from './ui'

const KIND = {
  red: SEVERITY.red, amber: SEVERITY.amber, missing: SEVERITY.missing,
  verify: SEVERITY.green, info: { soft: '#F6F3EC', text: '#3A3D4D' },
}

// Replays the pipeline's trace as a conversation between the agents, one message at a time.
export default function AgentFeed({ analysis, onFocus }) {
  const [count, setCount] = useState(0)
  const [run, setRun] = useState(0)
  const box = useRef(null)
  const trace = analysis.trace

  useEffect(() => {
    setCount(0)
    let i = 0
    const id = setInterval(() => {
      i += 1
      setCount(i)
      if (i >= trace.length) clearInterval(id)
    }, 650)
    return () => clearInterval(id)
  }, [trace, run])

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' })
  }, [count])

  return (
    <Card className="lg:col-span-5" delay={0.1}>
      <CardHead
        title="How the verdict was reached"
        right={
          <button type="button" onClick={() => setRun((r) => r + 1)} className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 text-xs font-extrabold hover:border-ink/30">
            <RotateCcw size={12} /> Replay
          </button>
        }
      />
      <div ref={box} className="scrollbar-thin flex h-[340px] flex-col gap-3 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {trace.slice(0, count).map((t, i) => {
            const from = AGENTS[t.from] || AGENTS.Reader
            const k = KIND[t.kind] || KIND.info
            return (
              <motion.button
                type="button"
                key={`${run}-${i}`}
                initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.5, ease: EASE }}
                onClick={() => t.clause_id && onFocus([t.clause_id], t.rule_id ? [t.rule_id] : [])}
                className="flex w-full cursor-pointer gap-3 text-left"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${from.ink}14`, color: from.ink }}>
                  <from.icon size={17} />
                </span>
                <span className="flex flex-1 flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-muted">
                    <span style={{ color: from.ink }}>{t.from}</span> <ArrowRight size={11} /> {t.to}
                  </span>
                  <span className="rounded-2xl rounded-tl-sm px-3 py-2 text-[13px] font-semibold leading-snug" style={{ background: k.soft, color: k.text }}>
                    {t.text}
                  </span>
                </span>
              </motion.button>
            )
          })}
        </AnimatePresence>
        {count < trace.length && (
          <div className="flex items-center gap-1.5 pl-12">
            {[0, 1, 2].map((d) => (
              <motion.span key={d} className="h-1.5 w-1.5 rounded-full bg-muted" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }} />
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
