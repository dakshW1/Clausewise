import { motion } from 'framer-motion'
import {
  Ban, Banknote, Building2, Calendar, CalendarClock, CalendarDays, Check, Clock, DoorOpen, EyeOff, FileText, Gavel,
  Headset, Hourglass, House, Lightbulb, Link, ListChecks, Lock, LogOut, Palmtree, Percent, PhoneCall, PiggyBank, Play,
  Receipt, RefreshCw, Repeat, Shield, Shuffle, Smartphone, Snowflake, Square, TimerOff, TrendingUp, TriangleAlert,
  Undo2, Users, Wallet, Wrench, X, Zap,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { EASE } from '../components/motion-bits'
import { api } from '../lib/api'
import { speak, stopSpeaking } from '../lib/speech'
import { useStore } from '../lib/store'
import { LANGUAGES, SEVERITY } from '../lib/theme'
import { PageHead } from './ReportLayout'

// One picture per clause category, so the agreement can be followed without reading.
const ICONS = {
  parties: Users, premises: House, rent: Wallet, deposit: PiggyBank, refund: Undo2, rent_revision: TrendingUp,
  lock_in: Lock, repairs: Wrench, entry: DoorOpen, eviction: LogOut, utilities: Zap, essential_services: Zap,
  notice: CalendarClock, maintenance_charges: Building2, dispute_resolution: Gavel,
  salary: Banknote, probation: Hourglass, working_hours: Clock, leave: Palmtree, bond: Link, non_compete: Ban,
  ip: Lightbulb, termination: LogOut, final_settlement: Receipt, unilateral_changes: Shuffle, confidentiality: EyeOff,
  loan_amount: Banknote, emi: CalendarDays, interest: Percent, fees: Receipt, rate_change: TrendingUp,
  prepayment: TimerOff, penal_charges: TriangleAlert, recovery: PhoneCall, data_access: Smartphone, grievance: Headset,
  cooling_off: Snowflake, scope: ListChecks, payment: Wallet, revisions: Repeat, liability: Shield, exclusivity: Ban,
  late_payment: TimerOff, renewal: RefreshCw, restraint: Ban, term: Calendar,
}
const BADGE = { green: Check, amber: TriangleAlert, red: X }

// The one number that matters most in a clause: an amount, a percentage or a duration.
function keyNumber(text) {
  const m = text.match(/(?:Rs\.?|₹|INR)\s?[\d,]+(?:\.\d+)?|\d+(?:\.\d+)?\s?%|\d+\s?(?:months?|days?|years?|hours?)/i)
  return m ? m[0].replace(/^Rs\.?\s?|^INR\s?/i, '₹') : null
}

export default function PicturesPage() {
  const { analysis, lang, setLang } = useStore()
  const [speaking, setSpeaking] = useState(null)
  const [playing, setPlaying] = useState(false)
  const queue = useRef(null)
  const voiced = useRef(new Map())

  useEffect(() => () => { queue.current = null; stopSpeaking() }, [])

  // Translate and voice a clause once per language, then replay from memory.
  async function say(c) {
    const key = `${c.id}|${lang}`
    if (!voiced.current.has(key)) {
      const text = `${c.title}. ${c.simple}`
      voiced.current.set(key, await api.speak(text, lang).catch(() => ({ text, language_code: 'en-IN' })))
    }
    const v = voiced.current.get(key)
    return new Promise((resolve) => speak(v.text, v.language_code, v.audio_base64, { onStart: () => setSpeaking(c.id), onEnd: resolve }))
  }

  async function tap(c) {
    queue.current = null
    setPlaying(false)
    stopSpeaking()
    setSpeaking(c.id)
    await say(c)
    setSpeaking((s) => (s === c.id ? null : s))
  }

  async function playAll() {
    if (queue.current) { queue.current = null; stopSpeaking(); setSpeaking(null); setPlaying(false); return }
    const run = {}
    queue.current = run
    setPlaying(true)
    for (const c of analysis.clauses) {
      if (queue.current !== run) return
      setSpeaking(c.id)
      document.querySelector(`[data-picture="${c.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      await say(c)
    }
    queue.current = null
    setSpeaking(null)
    setPlaying(false)
  }

  return (
    <>
      <PageHead kicker={['03', 'Pictures']} title="Tap a picture," accent="hear the clause." sub="Every clause as a picture with its key number. Green tick is fair, yellow sign is unusual, red cross is unfair. Tap any card to hear it." />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button type="button" onClick={playAll} className="flex h-12 cursor-pointer items-center gap-2 rounded-full bg-ink px-5 text-sm font-extrabold text-white">
          {playing ? <><Square size={15} fill="currentColor" /> Stop</> : <><Play size={15} fill="currentColor" /> Read all aloud</>}
        </button>
        <div className="flex flex-wrap gap-1 rounded-full bg-surface p-1 shadow-[0_1px_2px_rgba(20,20,20,0.05)]">
          {LANGUAGES.map((l) => (
            <button type="button" key={l.code} onClick={() => { setLang(l.code); voiced.current.clear() }} className="relative cursor-pointer rounded-full px-3 py-1.5 text-xs font-extrabold">
              {lang === l.code && <motion.span layoutId="pic-lang" className="absolute inset-0 rounded-full bg-ink" />}
              <span className={`relative ${lang === l.code ? 'text-white' : 'text-muted'}`}>{l.native}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {analysis.clauses.map((c, i) => {
          const s = SEVERITY[c.severity]
          const Icon = ICONS[c.category] || FileText
          const Badge = BADGE[c.severity]
          const number = keyNumber(c.text)
          const on = speaking === c.id
          return (
            <motion.button
              type="button"
              key={c.id}
              data-picture={c.id}
              onClick={() => tap(c)}
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, ease: EASE, delay: (i % 4) * 0.06 }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.96 }}
              className="relative flex cursor-pointer flex-col items-center gap-3 rounded-[24px] bg-surface p-5 text-center shadow-[0_1px_2px_rgba(20,20,20,0.05)]"
              style={{ boxShadow: on ? `0 0 0 3px ${s.color}, 0 20px 50px rgba(20,20,20,0.12)` : undefined }}
              aria-label={`${c.title}: ${c.simple}`}
            >
              <span className="num absolute left-4 top-3 text-xs font-extrabold text-muted">{c.number}</span>
              <span className="relative mt-2 flex h-24 w-24 items-center justify-center rounded-full" style={{ background: s.soft, color: s.text }}>
                {on && <span className="pulse-ring absolute inset-0 rounded-full" style={{ background: s.color, opacity: 0.25 }} />}
                <Icon size={44} strokeWidth={1.6} className="relative" />
                <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-4 border-surface text-white" style={{ background: s.color }}>
                  <Badge size={16} strokeWidth={3} />
                </span>
              </span>
              {number && <span className="num text-2xl font-extrabold leading-none tracking-[-0.02em]">{number}</span>}
              <span className="text-sm font-extrabold leading-tight">{c.title}</span>
              {on ? (
                <span className="flex h-4 items-end gap-[3px]" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((b) => (
                    <motion.span key={b} className="w-[3px] rounded-full" style={{ background: s.color }} animate={{ height: [4, 14, 4] }} transition={{ duration: 0.7, repeat: Infinity, delay: b * 0.1 }} />
                  ))}
                </span>
              ) : (
                <span className="h-4 text-[11px] font-bold text-muted">Tap to hear</span>
              )}
            </motion.button>
          )
        })}
      </div>
    </>
  )
}
