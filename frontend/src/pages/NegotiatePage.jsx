import { motion } from 'framer-motion'
import { ArrowRight, Check, Copy, LoaderCircle, MessageCircle, Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EASE } from '../components/motion-bits'
import { api } from '../lib/api'
import { speak, stopSpeaking } from '../lib/speech'
import { useStore } from '../lib/store'
import { LANGUAGES, SEVERITY } from '../lib/theme'
import { PageHead } from './ReportLayout'

// Messages already written this session, so revisiting the page doesn't ask Gemma again.
const written = new Map()

export default function NegotiatePage() {
  const { analysis, lang, setLang } = useStore()
  const navigate = useNavigate()
  const them = (analysis.parties?.them || 'other side').toLowerCase()
  // Sending the message moves the case into negotiation and records it on the timeline.
  const logSent = async () => {
    if (!analysis.case_id) return
    try {
      await api.addEvent(analysis.case_id, 'message_sent', `Sent the negotiation message to the ${them}.`)
      await api.setStatus(analysis.case_id, 'negotiating')
    } catch {
      // history is optional; the message itself was still sent
    }
  }
  const key = `${analysis.title}|${analysis.score}|${analysis.clauses.length}|${lang}`
  const [data, setData] = useState(() => written.get(key) ?? null)
  const [typed, setTyped] = useState(() => (written.has(key) ? Infinity : 0))
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (written.has(key)) {
      setData(written.get(key))
      return stopSpeaking
    }
    setData(null)
    setTyped(0)
    let cancelled = false
    api.negotiate(lang, analysis)
      .then((d) => { written.set(key, d); if (!cancelled) setData(d) })
      .catch((e) => !cancelled && setError(e.message))
    return () => { cancelled = true; stopSpeaking() }
  }, [key, lang, analysis])

  useEffect(() => {
    if (!data || typed >= data.message.length) return
    const id = setInterval(() => setTyped((t) => Math.min(t + 2, data.message.length)), 16)
    return () => clearInterval(id)
  }, [data, typed])

  const flags = analysis.clauses.filter((c) => c.severity === 'red' || c.severity === 'amber')
  const done = data && typed >= data.message.length

  return (
    <>
      <PageHead kicker={['06', 'Negotiate']} title="Don’t argue." accent="Ask, with the law." sub="Every flagged clause becomes a respectful request that cites the rule, written in your language." />
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="mb-5 flex flex-wrap gap-1.5">
            {LANGUAGES.map((l) => (
              <button type="button" key={l.code} onClick={() => setLang(l.code)} className="relative cursor-pointer rounded-full px-3 py-1.5 text-xs font-extrabold">
                {lang === l.code && <motion.span layoutId="neg-lang" className="absolute inset-0 rounded-full bg-ink" />}
                <span className={`relative ${lang === l.code ? 'text-white' : 'text-muted hover:text-ink'}`}>{l.native}</span>
              </button>
            ))}
          </div>

          <p className="mb-2 text-[15px] font-extrabold">Asking to change</p>
          <div className="flex flex-col gap-2">
            {flags.map((c, i) => {
              const s = SEVERITY[c.severity]
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: -16, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  transition={{ delay: 0.15 + i * 0.07, ease: EASE, duration: 0.5 }}
                  className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-3 text-sm font-bold shadow-[0_1px_2px_rgba(20,20,20,0.05)]"
                >
                  <span className="num flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold" style={{ background: s.soft, color: s.text }}>{c.number}</span>
                  <span className="flex flex-1 flex-col">
                    <span>{c.title}</span>
                    <span className="text-xs font-semibold text-muted">{c.reason}</span>
                  </span>
                  {c.rule_id && <span className="num shrink-0 rounded-full bg-ink px-2 py-0.5 text-[11px] font-extrabold text-glow-money">{c.rule_id}</span>}
                </motion.div>
              )
            })}
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            <button type="button" disabled={!data} onClick={() => speak(data.message, data.language_code, data.audio_base64)} className="flex h-12 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-extrabold hover:border-ink/30 disabled:opacity-40">
              <Volume2 size={16} /> Play aloud
            </button>
            <button type="button" disabled={!data} onClick={() => { navigator.clipboard.writeText(data.message); setCopied(true) }} className="flex h-12 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-extrabold hover:border-ink/30 disabled:opacity-40">
              {copied ? <Check size={16} className="text-money" /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy'}
            </button>
            <a href={data?.whatsapp_url} target="_blank" rel="noreferrer" onClick={logSent} className={`flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-sm font-extrabold text-white transition hover:bg-ink-2 ${data ? '' : 'pointer-events-none opacity-40'}`}>
              <MessageCircle size={16} /> Send on WhatsApp
            </a>
          </div>
          {error && <p className="mt-3 text-sm font-bold text-danger">Could not write the message: {error}</p>}
          {analysis.case_id && (
            <button type="button" onClick={async () => { await logSent(); navigate(`/history/${analysis.case_id}`) }} className="group mt-4 flex h-12 cursor-pointer items-center gap-2 rounded-full bg-money px-6 text-sm font-extrabold text-white transition hover:brightness-110">
              I’ve sent it · track the replies <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
            </button>
          )}
        </div>

        <motion.div initial={{ rotate: 5, y: 40, opacity: 0 }} animate={{ rotate: 0, y: 0, opacity: 1 }} transition={{ duration: 0.9, ease: EASE, delay: 0.1 }} className="mx-auto w-[320px] rounded-[44px] bg-ink p-2.5 shadow-[0_40px_100px_rgba(20,20,20,0.35)] lg:sticky lg:top-[140px]">
          <div className="overflow-hidden rounded-[36px] bg-[#0b141a] text-white">
            <div className="flex items-center gap-3 bg-[#202c33] px-4 pb-3 pt-7">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-glow-heat/30 text-sm font-extrabold text-glow-heat">{(analysis.parties?.them || 'Landlord')[0]}</span>
              <span className="flex flex-col">
                <span className="text-sm font-extrabold">{analysis.parties?.them || 'Landlord'}</span>
                <span className="text-[11px] font-semibold text-white/50">{done ? 'online' : 'Clausewise is typing…'}</span>
              </span>
            </div>
            <div className="h-[460px] overflow-y-auto p-3" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '14px 14px' }}>
              {!data && !error && <div className="flex h-full items-center justify-center text-white/40"><LoaderCircle className="animate-spin" /></div>}
              {data && (
                <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="ml-auto max-w-[94%] rounded-xl rounded-tr-sm bg-[#005c4b] px-3 py-2 text-[13px] leading-relaxed">
                  {data.message.slice(0, typed)}
                  {!done && <span className="caret ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-white" />}
                  {done && <span className="mt-1 block text-right text-[10px] text-white/50">now ✓✓</span>}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  )
}
