import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Handshake, LifeBuoy, LoaderCircle, Mic, Send, Square, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { browserRecognition, speak, stopSpeaking } from '../lib/speech'
import { LANGUAGES, suggestionsFor } from '../lib/theme'
import { EASE, PulseDot } from './motion-bits'

const BARS = 32
const MODE_COLOR = { idle: '#E9E5DC', recording: '#E38B93', thinking: '#B8B0D8', speaking: '#8FCBA8' }

function Orb({ mode, levels, onClick, small = false }) {
  const c = MODE_COLOR[mode]
  const box = small ? 64 : 176
  const s = box / 200
  return (
    <button type="button" onClick={onClick} className="relative mx-auto flex shrink-0 cursor-pointer items-center justify-center" style={{ width: box, height: box }} aria-label={mode === 'recording' ? 'Stop recording' : 'Ask by voice'}>
      <svg viewBox="0 0 200 200" className="absolute inset-0">
        {Array.from({ length: BARS }, (_, i) => {
          const a = (i / BARS) * Math.PI * 2
          const lvl = mode === 'recording' ? levels[i % levels.length] || 0 : 0
          const len = 6 + lvl * 34
          return (
            <motion.line
              key={i}
              x1={100 + Math.cos(a) * 64} y1={100 + Math.sin(a) * 64}
              animate={{ x2: 100 + Math.cos(a) * (64 + len), y2: 100 + Math.sin(a) * (64 + len), opacity: mode === 'recording' ? 1 : 0.3 }}
              transition={{ duration: 0.08 }}
              stroke={c} strokeWidth="3" strokeLinecap="round"
            />
          )
        })}
      </svg>
      {mode === 'speaking' && [0, 1].map((i) => (
        <span key={i} className="pulse-ring absolute rounded-full border-2" style={{ width: 112 * s, height: 112 * s, borderColor: c, animationDelay: `${i * 0.9}s` }} />
      ))}
      <motion.span
        className="relative flex items-center justify-center rounded-full text-night"
        style={{ width: 112 * s, height: 112 * s, background: c, boxShadow: `0 0 ${50 * s}px ${c}88` }}
        animate={mode === 'idle' ? { scale: [1, 1.05, 1] } : { scale: 1 }}
        transition={{ duration: 2.4, repeat: Infinity }}
        whileTap={{ scale: 0.92 }}
      >
        {mode === 'recording' ? <Square size={30 * s + 4} fill="currentColor" /> : mode === 'thinking' ? <LoaderCircle size={34 * s + 4} className="animate-spin" /> : mode === 'speaking' ? <Volume2 size={34 * s + 4} /> : <Mic size={36 * s + 4} />}
      </motion.span>
    </button>
  )
}

export default function VoicePanel({ analysis, lang, setLang, health, onCite, onNegotiate }) {
  const [messages, setMessages] = useState([])
  const [mode, setMode] = useState('idle')
  const [levels, setLevels] = useState([])
  const [text, setText] = useState('')
  const [hint, setHint] = useState(null)
  const rec = useRef({})
  const list = useRef(null)

  useEffect(() => {
    if (messages.length) list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' })
  }, [messages, mode])

  useEffect(() => () => { stopSpeaking(); stopStream() }, [])

  function stopStream() {
    cancelAnimationFrame(rec.current.raf)
    rec.current.stream?.getTracks().forEach((t) => t.stop())
    rec.current.ctx?.close()
    rec.current = {}
  }

  async function ask(question, code = lang) {
    if (!question.trim()) return
    setHint(null)
    setMessages((m) => [...m, { role: 'user', text: question }])
    setMode('thinking')
    try {
      const r = await api.ask(question, code, analysis)
      setMessages((m) => [...m, { role: 'assistant', ...r }])
      onCite(r.clause_ids, r.rule_ids)
      speak(r.answer, r.language_code, r.audio_base64, { onStart: () => setMode('speaking'), onEnd: () => setMode('idle') })
      setTimeout(() => setMode((x) => (x === 'thinking' ? 'idle' : x)), 400)
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', answer: `Something went wrong (${e.message}). Please try again.`, clause_ids: [], rule_ids: [] }])
      setMode('idle')
    }
  }

  async function startRecording() {
    stopSpeaking()
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setHint('Microphone blocked. Type your question below instead.')
      return
    }
    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 64
    ctx.createMediaStreamSource(stream).connect(analyser)
    const data = new Uint8Array(analyser.frequencyBinCount)
    const tick = () => {
      analyser.getByteFrequencyData(data)
      setLevels(Array.from(data.slice(0, BARS), (v) => v / 255))
      rec.current.raf = requestAnimationFrame(tick)
    }
    rec.current = { stream, ctx }
    tick()
    setMode('recording')

    if (health?.sarvam) {
      const chunks = []
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = (e) => chunks.push(e.data)
      mr.onstop = async () => {
        stopStream()
        setMode('thinking')
        try {
          const r = await api.voice(new Blob(chunks, { type: 'audio/webm' }))
          const code = LANGUAGES.some((l) => l.code === r.language_code) ? r.language_code : lang
          if (code !== lang) setLang(code)
          if (r.text) await ask(r.text, code)
          else setMode('idle')
        } catch {
          setHint('Could not transcribe. Try again or type.')
          setMode('idle')
        }
      }
      mr.start()
      rec.current.recorder = mr
      return
    }

    const Recognition = browserRecognition()
    if (!Recognition) {
      stopStream()
      setMode('idle')
      setHint('Voice needs Chrome or a Sarvam API key. Type your question below.')
      return
    }
    const r = new Recognition()
    r.lang = lang
    r.interimResults = false
    let heard = ''
    r.onresult = (e) => { heard = e.results[0][0].transcript }
    r.onend = () => {
      stopStream()
      if (heard) ask(heard)
      else { setMode('idle'); setHint('I didn’t catch that. Tap the mic and try again.') }
    }
    r.onerror = () => {}
    r.start()
    rec.current.recognition = r
  }

  function toggle() {
    if (mode === 'recording') {
      rec.current.recorder?.stop()
      rec.current.recognition?.stop()
    } else if (mode === 'speaking') {
      stopSpeaking()
      setMode('idle')
    } else if (mode === 'idle') {
      startRecording()
    }
  }

  const suggestions = suggestionsFor(analysis.doc_type, lang)
  const status = { idle: 'Tap and ask in your language', recording: 'Listening… tap to stop', thinking: 'Checking your agreement…', speaking: 'Speaking · tap to stop' }[mode]

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[24px] bg-night text-night-text">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-glow-heat/20 blur-[70px]" />
      <div className="relative border-b border-night-line p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-night-muted">
            <PulseDot color={MODE_COLOR[mode]} /> Ask Clausewise
          </span>
          <span className="text-[11px] font-bold text-night-muted">{health?.sarvam ? 'Voice by Sarvam AI' : 'Browser voice'}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGES.map((l) => (
            <button type="button" key={l.code} onClick={() => setLang(l.code)} className="relative cursor-pointer rounded-full px-3 py-1.5 text-xs font-extrabold">
              {lang === l.code && <motion.span layoutId="lang" className="absolute inset-0 rounded-full bg-white" />}
              <span className={`relative ${lang === l.code ? 'text-ink' : 'text-night-muted hover:text-white'}`}>{l.native}</span>
            </button>
          ))}
        </div>
      </div>

      <div ref={list} className="scrollbar-thin relative flex-1 space-y-3 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div>
            <Orb mode={mode} levels={levels} onClick={toggle} />
            <p className="mt-2 text-center text-sm font-bold text-night-muted">{status}</p>
            <div className="mt-5 flex flex-col gap-2">
              {suggestions.map((s, i) => (
                <motion.button
                  type="button"
                  key={s}
                  initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ delay: 0.2 + i * 0.08, ease: EASE, duration: 0.6 }}
                  onClick={() => ask(s)}
                  className="group flex cursor-pointer items-center justify-between gap-2 rounded-2xl border border-night-line bg-white/5 px-4 py-3 text-left text-sm font-semibold transition hover:bg-white/10"
                >
                  {s}
                  <ArrowRight size={14} className="shrink-0 opacity-0 transition group-hover:opacity-100" />
                </motion.button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ ease: EASE, duration: 0.5 }} className={m.role === 'user' ? 'flex justify-end' : ''}>
              {m.role === 'user' ? (
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-glow-heat px-4 py-2.5 text-sm font-bold text-night">{m.text}</div>
              ) : (
                <div className="max-w-[96%]">
                  <div className="rounded-2xl rounded-bl-sm bg-paper px-4 py-3 text-[15px] font-medium leading-relaxed text-ink">{m.answer}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {m.clause_ids?.map((id) => {
                      const c = analysis.clauses.find((x) => x.id === id)
                      return (
                        <button type="button" key={id} onClick={() => onCite([id], m.rule_ids)} className="cursor-pointer rounded-full bg-white/10 px-3 py-1 text-[11px] font-extrabold text-white hover:bg-white/20">
                          Clause {c?.number ?? id}
                        </button>
                      )
                    })}
                    {m.rule_ids?.map((id) => (
                      <span key={id} className="rounded-full bg-glow-money/15 px-3 py-1 text-[11px] font-extrabold text-glow-money">Rule {id}</span>
                    ))}
                    {m.answer && (
                      <button type="button" onClick={() => speak(m.answer, m.language_code, m.audio_base64, { onStart: () => setMode('speaking'), onEnd: () => setMode('idle') })} className="ml-auto cursor-pointer text-night-muted hover:text-white" aria-label="Play again">
                        <Volume2 size={15} />
                      </button>
                    )}
                  </div>
                  {m.confidence === 'low' && (
                    <div className="mt-2 rounded-xl bg-info/25 px-3 py-2 text-xs font-bold text-[#CAD5E6]">
                      <span className="flex items-center gap-2"><LifeBuoy size={14} /> I'm not sure about this one. Please check with a person.</span>
                      <span className="mt-1.5 flex flex-wrap gap-2 pl-6">
                        <a href="tel:15100" className="underline">Call NALSA free legal aid: 15100</a>
                        <a href="https://nalsa.gov.in" target="_blank" rel="noreferrer" className="underline">Find your District Legal Services Authority</a>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="relative border-t border-night-line p-4">
        {messages.length > 0 && (
          <div className="mb-3 flex items-center gap-3">
            <Orb small mode={mode} levels={levels} onClick={toggle} />
            <span className="text-sm font-bold text-night-muted">{status}</span>
          </div>
        )}
        {hint && <p className="mb-2 text-xs font-bold text-[#D9B56E]">{hint}</p>}
        <form onSubmit={(e) => { e.preventDefault(); ask(text); setText('') }} className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Or type your question…"
            className="h-11 flex-1 rounded-full border border-night-line bg-white/5 px-4 text-sm font-semibold outline-none placeholder:text-night-muted focus:border-white/30"
          />
          <button type="submit" className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Send"><Send size={16} /></button>
        </form>
        <button type="button" onClick={onNegotiate} className="group mt-3 flex h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-glow-heat text-[15px] font-extrabold text-night transition hover:brightness-110">
          <Handshake size={18} /> Negotiate for me <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  )
}
