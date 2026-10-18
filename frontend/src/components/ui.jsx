import { motion } from 'framer-motion'
import { EASE } from './motion-bits'

export function LogoMark({ size = 28, className }) {
  // A scale of justice: one orange pan carries the weight.
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M16 5v22M10 27h12M5 9h22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M5 9l-3.2 8.5M5 9l3.2 8.5M27 9l-3.2 8.5M27 9l3.2 8.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M1.4 17.5h7.2a3.6 3.6 0 0 1-7.2 0z" fill="currentColor" />
      <path d="M23.4 17.5h7.2a3.6 3.6 0 0 1-7.2 0z" fill="#D8B26A" />
    </svg>
  )
}

export function Logo({ dark = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className={dark ? 'text-white' : 'text-ink'} />
      <span className={`font-display text-[19px] font-extrabold tracking-tight ${dark ? 'text-white' : 'text-ink'}`}>Clausewise</span>
    </span>
  )
}

export function Card({ children, className = '', dark = false, delay = 0 }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, ease: EASE, delay }}
      className={`relative rounded-[24px] p-5 sm:p-6 ${dark ? 'overflow-hidden bg-night text-night-text' : 'bg-surface shadow-[0_1px_2px_rgba(18,20,31,0.05)]'} ${className}`}
    >
      {children}
    </motion.section>
  )
}

export function CardHead({ title, sub, right, dark = false }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
      <h2 className={`text-[15px] font-extrabold ${dark ? 'text-night-text' : ''}`}>{title}</h2>
      {right ?? (sub && <span className={`text-xs font-bold ${dark ? 'text-night-muted' : 'text-muted'}`}>{sub}</span>)}
    </div>
  )
}

export function Chip({ color, soft, children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${className}`} style={{ color, background: soft }}>
      {children}
    </span>
  )
}
