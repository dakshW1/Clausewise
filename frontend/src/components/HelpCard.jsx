import { motion } from 'framer-motion'
import { ExternalLink, LifeBuoy, Phone } from 'lucide-react'
import { EASE } from './motion-bits'

// Free legal aid in India: the NALSA helpline, and the District Legal Services Authority (DLSA) near you.
export default function HelpCard({ highStakes = false, compact = false, reason }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, ease: EASE }}
      className={`flex flex-wrap items-center gap-4 rounded-[24px] border ${highStakes ? 'border-danger/30 bg-danger-soft' : 'border-line bg-surface'} ${compact ? 'p-4' : 'p-5 sm:p-6'}`}
    >
      <span className={`flex shrink-0 items-center justify-center rounded-2xl ${highStakes ? 'bg-danger text-white' : 'bg-paper text-ink'} ${compact ? 'h-10 w-10' : 'h-12 w-12'}`}>
        <LifeBuoy size={compact ? 18 : 22} />
      </span>
      <div className="min-w-[220px] flex-1">
        <p className={`font-extrabold ${compact ? 'text-sm' : 'text-[15px]'}`}>{highStakes ? 'High stakes: talk to a free lawyer before you sign' : 'Not sure? Check with a human'}</p>
        <p className="mt-0.5 text-xs font-semibold text-ink-2">
          {reason || 'Clausewise explains documents; it is not legal advice.'} Free legal aid is available to many people in India, including women, workers and people on low incomes.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href="tel:15100" className="flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-xs font-extrabold text-white"><Phone size={14} /> Call NALSA 15100</a>
        <a href="https://nalsa.gov.in" target="_blank" rel="noreferrer" className="flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-xs font-extrabold">Find your DLSA <ExternalLink size={13} /></a>
      </div>
    </motion.section>
  )
}
