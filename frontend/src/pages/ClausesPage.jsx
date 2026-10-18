import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import ClauseList from '../components/ClauseList'
import { useStore } from '../lib/store'
import { SEVERITY } from '../lib/theme'
import { PageHead } from './ReportLayout'

// The original document stays pinned on the left and follows along as you scroll the plain-language cards.
export default function ClausesPage() {
  const { analysis, active, focus } = useStore()
  const [spy, setSpy] = useState(analysis.clauses[0]?.id)
  const counts = analysis.counts
  const pane = useRef(null)

  // Keep the paragraph being read in view inside the pinned document (scrolling only that pane, not the page).
  useEffect(() => {
    const box = pane.current
    const el = box?.querySelector(`[data-clause="${spy}"]`)
    if (box && el) box.scrollTo({ top: el.offsetTop - box.clientHeight / 3, behavior: 'smooth' })
  }, [spy])

  return (
    <>
      <PageHead
        kicker={['02', 'Clauses']}
        title="Every clause,"
        accent="in plain words."
        sub={`${counts.red} unfair, ${counts.amber} unusual, ${counts.green} fair, and ${counts.missing} important clauses missing.`}
      />
      <div className="grid gap-5 lg:grid-cols-12">
        <aside className="hidden lg:col-span-5 lg:block">
          <div className="sticky top-[136px] flex gap-3">
            <DocumentMap clauses={analysis.clauses} spy={spy} onPick={(c) => focus([c.id], c.rule_id ? [c.rule_id] : [])} />
            <div ref={pane} className="paper-doc scrollbar-thin relative max-h-[calc(100vh-170px)] flex-1 overflow-y-auto rounded-[24px] p-6 shadow-[0_1px_2px_rgba(18,20,31,0.05)]">
              <p className="mb-4 text-center font-sans text-[11px] font-extrabold uppercase tracking-[0.3em] text-black/45">{analysis.title}</p>
              <div className="flex flex-col gap-1 font-serif text-[15px] leading-snug">
                {analysis.clauses.map((c) => {
                  const s = SEVERITY[c.severity]
                  const on = spy === c.id
                  return (
                    <button
                      type="button"
                      key={c.id}
                      data-clause={c.id}
                      onClick={() => focus([c.id], c.rule_id ? [c.rule_id] : [])}
                      className="relative cursor-pointer rounded-lg px-3 py-2 text-left transition"
                    >
                      {on && <motion.span layoutId="doc-spy" className="absolute inset-0 rounded-lg" style={{ background: s.soft }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} />}
                      {on && <motion.span layoutId="doc-spy-bar" className="absolute inset-y-1 left-0 w-1 rounded-full" style={{ background: s.color }} />}
                      <span className="relative">
                        <b className="font-sans text-xs font-extrabold">{c.number}.</b>{' '}
                        <span style={c.severity === 'green' ? undefined : { textDecoration: 'underline', textDecorationColor: s.color, textDecorationThickness: 2, textUnderlineOffset: 3 }}>
                          {c.text}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </aside>
        <div className="lg:col-span-7">
          <ClauseList analysis={analysis} active={active} onSpy={setSpy} />
        </div>
      </div>
    </>
  )
}

// A vertical strip, one segment per clause, coloured by verdict: the whole agreement at a glance.
function DocumentMap({ clauses, spy, onPick }) {
  return (
    <div className="flex w-3 flex-col gap-1 py-2" aria-label="Document map">
      {clauses.map((c, i) => (
        <motion.button
          type="button"
          key={c.id}
          title={`Clause ${c.number}: ${c.title}`}
          onClick={() => onPick(c)}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1, opacity: spy === c.id ? 1 : 0.45 }}
          transition={{ delay: 0.2 + i * 0.04 }}
          className="w-full flex-1 origin-top cursor-pointer rounded-full"
          style={{ background: SEVERITY[c.severity].color, minHeight: 18 }}
        />
      ))}
    </div>
  )
}
