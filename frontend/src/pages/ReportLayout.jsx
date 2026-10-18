import { AnimatePresence, motion } from 'framer-motion'
import { CalendarClock, FileText, Handshake, LayoutGrid, Link2, Mic, RotateCcw } from 'lucide-react'
import { useEffect } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { EASE, Words } from '../components/motion-bits'
import { Logo } from '../components/ui'
import { useStore } from '../lib/store'
import { verdict } from '../lib/theme'

export function hasTimeline(analysis) {
  return Boolean(analysis?.key_values?.term_months || analysis?.key_values?.start_date)
}

export default function ReportLayout() {
  const { analysis, health, clearFocus } = useStore()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  if (!analysis) return <Navigate to="/" replace />

  const live = analysis.source === 'gemma'
  const v = verdict(analysis.score)
  const tabs = [
    { to: '/report', end: true, label: 'Overview', icon: LayoutGrid },
    { to: '/report/clauses', label: 'Clauses', icon: FileText, count: analysis.clauses.length },
    { to: '/report/proof', label: 'Proof', icon: Link2 },
    hasTimeline(analysis) && { to: '/report/timeline', label: 'Timeline', icon: CalendarClock },
    { to: '/report/ask', label: 'Ask', icon: Mic },
    { to: '/report/negotiate', label: 'Negotiate', icon: Handshake },
  ].filter(Boolean)

  return (
    <motion.div key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="Clausewise home"><Logo /></Link>
          <span className="hidden h-6 w-px bg-line md:block" />
          <p className="hidden min-w-0 flex-1 truncate text-sm font-bold text-muted md:block">{analysis.title}</p>
          <div className="ml-auto flex items-center gap-2">
            <span className="num hidden h-9 items-center gap-2 rounded-full bg-ink px-3 text-xs font-extrabold text-white sm:flex">
              <span className="h-2 w-2 rounded-full" style={{ background: v.color }} /> {analysis.score}/100
            </span>
            <span className={`hidden h-9 items-center gap-2 rounded-full px-3 text-xs font-extrabold lg:flex ${live ? 'bg-money-soft text-[#174F3D]' : 'bg-surface text-muted'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-money' : 'bg-muted'}`} />
              {live ? `Live · ${health?.model || 'Gemma 4'}` : 'Demo mode'}
            </span>
            <button type="button" onClick={() => navigate('/')} className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-extrabold hover:border-ink/30">
              <RotateCcw size={15} /> New scan
            </button>
          </div>
        </div>
        <nav aria-label="Report sections" className="mx-auto flex max-w-[1240px] gap-1 overflow-x-auto px-4 pb-2 sm:px-6">
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end} onClick={clearFocus} className="relative shrink-0">
              {({ isActive }) => (
                <span className={`relative flex h-10 items-center gap-2 rounded-full px-4 text-sm font-extrabold transition ${isActive ? 'text-white' : 'text-muted hover:text-ink'}`}>
                  {isActive && <motion.span layoutId="report-tab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                  <t.icon size={15} className="relative" />
                  <span className="relative">{t.label}</span>
                  {t.count != null && <span className={`num relative text-xs ${isActive ? 'text-white/60' : 'text-muted/70'}`}>{t.count}</span>}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </header>

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
          transition={{ duration: 0.45, ease: EASE }}
          className="mx-auto max-w-[1240px] px-4 pb-24 pt-6 sm:px-6 lg:pt-8"
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>

      {!location.pathname.endsWith('/ask') && (
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.6, type: 'spring', stiffness: 260, damping: 18 }} className="fixed bottom-6 right-6 z-40">
          <Link to="/report/ask" className="group flex h-14 items-center gap-2 rounded-full bg-night pl-2 pr-5 text-sm font-extrabold text-night-text shadow-[0_20px_50px_rgba(11,13,23,0.35)]">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-glow-heat text-night">
              <span className="pulse-ring absolute inset-0 rounded-full bg-glow-heat/60" />
              <Mic size={18} className="relative" />
            </span>
            Ask in your language
          </Link>
        </motion.div>
      )}
    </motion.div>
  )
}

export function PageHead({ kicker, title, accent, sub }) {
  return (
    <div className="mb-6">
      {kicker && (
        <div className="mb-3 flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.2em] text-muted">
          <span className="num text-heat">{kicker[0]}</span><span className="h-px w-10 bg-ink/20" />{kicker[1]}
        </div>
      )}
      <h1 className="font-display text-[clamp(30px,4vw,48px)] font-extrabold leading-[1.05] tracking-[-0.04em]">
        <Words text={title} />{' '}
        {accent && <span className="font-serif font-normal italic text-heat"><Words text={accent} delay={0.25} /></span>}
      </h1>
      {sub && <p className="mt-2 max-w-2xl font-medium text-ink-2">{sub}</p>}
    </div>
  )
}
