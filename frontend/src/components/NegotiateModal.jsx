import { motion } from 'framer-motion'
import { Check, Copy, LoaderCircle, MessageCircle, Volume2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { speak, stopSpeaking } from '../lib/speech'
import { SEVERITY } from '../lib/theme'
import { EASE, Words } from './motion-bits'

export default function NegotiateModal({ analysis, lang, onClose }) {
  const [data, setData] = useState(null)
  const [typed, setTyped] = useState(0)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.negotiate(lang, analysis).then(setData).catch((e) => setError(e.message))
    return stopSpeaking
  }, [lang, analysis])

  useEffect(() => {
    if (!data) return
    const id = setInterval(() => setTyped((t) => Math.min(t + 2, data.message.length)), 16)
    return () => clearInterval(id)
  }, [data])

  const flags = analysis.clauses.filter((c) => c.severity === 'red')
  const done = data && typed >= data.message.length

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-night/70 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        initial={{ y: 40, opacity: 0, filter: 'blur(10px)' }}
        animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        className="relative grid max-h-[92vh] w-full max-w-[1000px] gap-8 overflow-y-auto rounded-[28px] bg-paper p-6 md:grid-cols-[1fr_330px] md:p-10"
      >
        <button type="button" onClick={onClose} className="absolute right-4 top-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full hover:bg-line" aria-label="Close"><X size={18} /></button>

        <div>
          <div className="mb-5 flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.2em] text-muted">
            <span className="num text-heat">05</span><span className="h-px w-10 bg-ink/20" /> Negotiate for me
          </div>
          <h3 className="font-display text-[clamp(32px,4.4vw,52px)] font-extrabold leading-[0.95] tracking-[-0.04em]">
            <Words text="Don’t argue." />{' '}
            <span className="font-serif font-normal italic text-money"><Words text="Ask, with the law." delay={0.15} /></span>
          </h3>
          <p className="mt-4 max-w-md font-medium text-ink-2">Every red flag becomes a respectful request that cites the national model law, written in your language.</p>

          <p className="mb-2 mt-7 text-[15px] font-extrabold">Asking to change</p>
          <div className="flex flex-col gap-2">
            {flags.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.08, ease: EASE }} className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2.5 text-sm font-bold">
                <span className="num flex h-7 w-7 items-center justify-center rounded-lg text-xs font-extrabold" style={{ background: SEVERITY.red.soft, color: SEVERITY.red.text }}>{c.number}</span>
                <span className="flex-1">{c.title}</span>
                <span className="num rounded-full bg-ink px-2 py-0.5 text-[11px] font-extrabold text-glow-money">{c.rule_id}</span>
              </motion.div>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            <button type="button" disabled={!data} onClick={() => speak(data.message, data.language_code, data.audio_base64)} className="flex h-12 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-extrabold hover:border-ink/30 disabled:opacity-40">
              <Volume2 size={16} /> Play aloud
            </button>
            <button type="button" disabled={!data} onClick={() => { navigator.clipboard.writeText(data.message); setCopied(true) }} className="flex h-12 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-extrabold hover:border-ink/30 disabled:opacity-40">
              {copied ? <Check size={16} className="text-money" /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy'}
            </button>
            <a href={data?.whatsapp_url} target="_blank" rel="noreferrer" className={`flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-sm font-extrabold text-white transition hover:bg-ink-2 ${data ? '' : 'pointer-events-none opacity-40'}`}>
              <MessageCircle size={16} /> Send on WhatsApp
            </a>
          </div>
          {error && <p className="mt-3 text-sm font-bold text-danger">Could not write the message: {error}</p>}
        </div>

        <motion.div initial={{ rotate: 5, y: 30, opacity: 0 }} animate={{ rotate: 0, y: 0, opacity: 1 }} transition={{ duration: 0.9, ease: EASE, delay: 0.1 }} className="mx-auto w-[310px] rounded-[44px] bg-ink p-2.5 shadow-[0_40px_100px_rgba(18,20,31,0.35)]">
          <div className="overflow-hidden rounded-[36px] bg-[#0b141a] text-white">
            <div className="flex items-center gap-3 bg-[#202c33] px-4 pb-3 pt-7">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-glow-heat/30 text-sm font-extrabold text-glow-heat">S</span>
              <span className="flex flex-col">
                <span className="text-sm font-extrabold">Landlord</span>
                <span className="text-[11px] font-semibold text-white/50">{done ? 'online' : 'Clausewise is typing…'}</span>
              </span>
            </div>
            <div className="h-[440px] overflow-y-auto p-3" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '14px 14px' }}>
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
      </motion.div>
    </motion.div>
  )
}
