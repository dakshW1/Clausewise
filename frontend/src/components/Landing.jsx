import Lenis from 'lenis'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, FileText, Link2, Mic, ScanLine, ShieldCheck, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CountTo, EASE, Kicker, PulseDot, Reveal, Typewriter, Words } from './motion-bits'
import Scales from './Scales'
import { Logo } from './ui'

const RED = '#E38B93'
const AMBER = '#D9B56E'
const GREEN = '#8FCBA8'
const BLUE = '#9DB4D8'
const coins = (color, n, tag) => Array.from({ length: n }, (_, i) => ({ id: `${tag}${i}`, color }))
const FULL_LANDLORD = [...coins(RED, 4, 'r'), ...coins(AMBER, 3, 'a'), ...coins(BLUE, 3, 'm')]

// One scale state per chapter: the beam tips as unfair clauses pile up, and levels out once Clausewise negotiates.
const CHAPTERS = [
  { id: 'top', label: 'Clausewise', idle: true, angle: 0, tenant: [], landlord: [] },
  { id: 'deposit', label: 'Deposit', angle: 7, tenant: [], landlord: coins(RED, 1, 'r') },
  { id: 'evict', label: 'Eviction', angle: 13, tenant: [], landlord: coins(RED, 2, 'r') },
  { id: 'read', label: 'Read', dim: true, angle: 17, tenant: coins(GREEN, 4, 'g'), landlord: FULL_LANDLORD },
  { id: 'voice', label: 'Ask', dim: true, angle: 17, tenant: coins(GREEN, 4, 'g'), landlord: FULL_LANDLORD },
  { id: 'negotiate', label: 'Negotiate', angle: 0, tenant: coins(GREEN, 6, 'g'), landlord: coins(GREEN, 6, 'h') },
  { id: 'join', label: 'Start', angle: 0, tenant: coins(GREEN, 6, 'g'), landlord: coins(GREEN, 6, 'h') },
]

const LANGS = ['English', 'हिंदी', 'தமிழ்', 'ಕನ್ನಡ', 'বাংলা', 'मराठी', 'తెలుగు', 'ગુજરાતી', 'മലയാളം', 'ਪੰਜਾਬੀ']

export default function Landing({ onStart: start, onBrowse: browse }) {
  const lenisRef = useRef(null)
  // Stop smooth scrolling before leaving, or Lenis keeps animating the next screen's scroll position.
  const onStart = (file) => {
    lenisRef.current?.destroy()
    lenisRef.current = null
    window.scrollTo({ top: 0, behavior: 'instant' })
    start(file)
  }
  const onBrowse = () => {
    lenisRef.current?.destroy()
    lenisRef.current = null
    window.scrollTo({ top: 0, behavior: 'instant' })
    browse()
  }
  const fileRef = useRef(null)
  const [chapter, setChapter] = useState(0)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduce) lenisRef.current = new Lenis({ autoRaf: true, lerp: 0.085 })
    let raf = 0
    let last = -1
    const tick = () => {
      const ch = Math.min(CHAPTERS.length - 1, Math.max(0, Math.round(window.scrollY / window.innerHeight)))
      if (ch !== last) { last = ch; setChapter(ch) }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      lenisRef.current?.destroy()
      lenisRef.current = null
    }
  }, [])

  const goTo = (i) => {
    const y = i * window.innerHeight
    if (lenisRef.current) lenisRef.current.scrollTo(y, { duration: 1.6 })
    else window.scrollTo({ top: y, behavior: 'smooth' })
  }
  const upload = () => fileRef.current?.click()
  const ch = CHAPTERS[chapter]

  return (
    <motion.div key="landing" exit={{ opacity: 0, filter: 'blur(8px)' }} transition={{ duration: 0.5 }} className="grain relative bg-night text-night-text">
      <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => e.target.files?.[0] && onStart(e.target.files[0])} />

      {/* Fixed scales behind every chapter */}
      <div className="fixed inset-0 z-0" aria-hidden="true">
        <motion.div
          className="absolute inset-y-0 right-0 flex w-full items-center justify-center opacity-25 lg:right-16 lg:w-[46%] lg:opacity-100"
          animate={{ opacity: ch.dim ? 0.16 : 1, scale: ch.dim ? 0.92 : 1, filter: ch.dim ? 'blur(3px)' : 'blur(0px)' }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          <div className="w-[min(600px,92%)]">
            <Scales idle={ch.idle} angle={ch.angle} tenantCoins={ch.tenant} landlordCoins={ch.landlord} size={600} />
          </div>
        </motion.div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(13,13,14,0.95)_0%,rgba(13,13,14,0.7)_40%,rgba(13,13,14,0)_68%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(0deg,rgba(13,13,14,0.9),rgba(13,13,14,0))]" />
      </div>

      <header className="fixed inset-x-0 top-0 z-30">
        <div className="mx-auto flex h-18 max-w-[1400px] items-center justify-between px-5 sm:px-8">
          <button type="button" onClick={() => goTo(0)} aria-label="Clausewise home" className="cursor-pointer"><Logo dark /></button>
          <nav className="flex items-center gap-2">
            <a href="#/history" onClick={() => { lenisRef.current?.destroy(); lenisRef.current = null; window.scrollTo({ top: 0, behavior: 'instant' }) }} className="hidden h-11 items-center rounded-full px-4 text-sm font-bold text-night-text/80 transition hover:text-white sm:flex">History</a>
            <button type="button" onClick={upload} className="hidden h-11 cursor-pointer items-center rounded-full px-4 text-sm font-bold text-night-text/80 transition hover:text-white md:flex">Upload a photo</button>
            <button type="button" onClick={onBrowse} className="flex h-11 cursor-pointer items-center gap-2 rounded-full bg-white px-5 text-sm font-extrabold text-ink transition hover:bg-white/90">
              Sample documents <ArrowRight size={16} />
            </button>
          </nav>
        </div>
      </header>

      <nav aria-label="Chapters" className="fixed right-6 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
        {CHAPTERS.map((c, i) => (
          <button key={c.id} type="button" onClick={() => goTo(i)} className="group flex cursor-pointer items-center justify-end gap-3">
            <span className={`text-xs font-bold transition ${i === chapter ? 'text-white opacity-100' : 'text-night-muted opacity-0 group-hover:opacity-100'}`}>{c.label}</span>
            <span className={`num w-6 text-right text-xs font-bold transition ${i === chapter ? 'text-glow-heat' : 'text-night-muted'}`}>{String(i).padStart(2, '0')}</span>
            <span className={`h-[2px] transition-all ${i === chapter ? 'w-10 bg-glow-heat' : 'w-4 bg-white/25'}`} />
          </button>
        ))}
      </nav>

      <div className="fixed bottom-5 left-5 z-30 hidden items-center gap-3 rounded-full border border-night-line bg-night/70 px-4 py-2 text-[11px] font-bold tracking-wide text-night-muted backdrop-blur sm:flex">
        <PulseDot color={ch.angle > 0 ? 'var(--glow-heat)' : 'var(--glow-money)'} />
        <span className="num">Scales · {ch.idle ? 'weighing' : ch.angle > 0 ? `tipped ${ch.angle}° to the landlord` : 'balanced'}</span>
        <span className="text-night-muted/70">· Model Tenancy Act, 2021</span>
      </div>

      <main className="relative z-10">
        <Hero onSample={() => onStart(null)} onUpload={upload} onBrowse={onBrowse} />
        <DepositChapter />
        <EvictChapter />
        <ReadChapter />
        <VoiceChapter />
        <NegotiateChapter />
        <JoinChapter onSample={onBrowse} onUpload={upload} />
      </main>
    </motion.div>
  )
}

function Chapter({ id, children }) {
  return (
    <section id={id} className="relative flex h-screen items-center">
      <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-8">{children}</div>
    </section>
  )
}

function Hero({ onSample, onUpload, onBrowse }) {
  return (
    <section id="top" className="relative flex h-screen flex-col justify-end pb-24 pt-24 sm:justify-center sm:pb-16">
      <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-8">
        <Reveal y={12} className="mb-7 inline-flex items-center gap-2 rounded-full border border-night-line bg-white/5 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-night-text/85 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-glow-money" /> For tenants, employees, borrowers and freelancers · Free
        </Reveal>
        <h1 className="font-display text-[clamp(44px,min(9.6vw,12.5vh),148px)] font-extrabold leading-[0.9] tracking-[-0.045em]">
          <Words text="Know what" />
          <br />
          <Words text="you’re" delay={0.2} />{' '}
          <span className="font-serif text-[1.08em] font-normal italic tracking-[-0.02em] text-glow-heat">
            <Words text="signing." delay={0.4} />
          </span>
        </h1>
        <Reveal delay={0.7} className="mt-6 max-w-[560px] text-[17px] font-medium leading-relaxed text-night-text/75 sm:text-lg">
          Clausewise reads your rent agreement, job offer, loan or freelance contract, <strong className="font-extrabold text-night-text">checks every clause against the law</strong>, explains it <strong className="font-extrabold text-night-text">in your language, by voice</strong>, and writes the polite reply that gets unfair terms changed.
        </Reveal>
        <Reveal delay={0.85} className="mt-7 flex flex-wrap gap-3">
          <button type="button" onClick={onSample} className="group flex h-13 cursor-pointer items-center gap-2 rounded-full bg-glow-heat px-7 text-[15px] font-extrabold text-night transition hover:brightness-110">
            Check the sample agreement <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
          </button>
          <button type="button" onClick={onUpload} className="flex h-13 cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 text-[15px] font-bold text-white backdrop-blur transition hover:bg-white/10">
            <Upload size={17} /> Upload photo or PDF
          </button>
          <button type="button" onClick={onBrowse} className="flex h-13 cursor-pointer items-center px-3 text-[15px] font-bold text-night-text/70 transition hover:text-white">
            Job offers, loans and more →
          </button>
        </Reveal>
      </div>
      <div className="absolute inset-x-0 bottom-0 overflow-hidden border-t border-night-line bg-night/60 py-3 backdrop-blur-sm">
        <div className="marquee flex w-max gap-10 whitespace-nowrap text-xs font-extrabold uppercase tracking-[0.25em] text-night-muted">
          {[0, 1].map((k) => (
            <span key={k} className="flex gap-10" aria-hidden={k === 1}>
              <span className="text-night-text/60">Explains in</span>
              {LANGS.map((l) => (
                <span key={l} className="flex items-center gap-2 text-[13px] normal-case tracking-normal"><span className="h-1.5 w-1.5 rounded-full bg-glow-heat" />{l}</span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function DepositChapter() {
  return (
    <Chapter id="deposit">
      <Kicker n="01">The deposit</Kicker>
      <div className="max-w-[640px]">
        <Reveal className="text-2xl font-bold text-night-text/70 sm:text-3xl">The landlord asks</Reveal>
        <Reveal delay={0.1} className="num relative inline-block text-[clamp(51px,min(9vw,13vh),136px)] font-extrabold leading-none tracking-[-0.04em] text-night-text/35">
          ₹90,000
          <motion.span
            className="absolute left-0 top-1/2 h-[6px] w-full origin-left rounded-full bg-danger"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ amount: 0.6 }}
            transition={{ duration: 0.7, delay: 0.5, ease: EASE }}
          />
        </Reveal>
        <Reveal delay={0.3} className="mt-4 text-2xl font-bold text-night-text/85 sm:text-3xl">
          The model law <span className="font-serif text-[1.15em] italic text-glow-money">allows</span>
        </Reveal>
        <div className="num text-[clamp(67px,min(12.5vw,18vh),190px)] font-extrabold leading-[0.9] tracking-[-0.05em] text-glow-money">
          <CountTo from={90000} to={36000} prefix="₹" delay={0.6} />
        </div>
        <Reveal delay={0.5} className="mt-8 flex flex-wrap gap-2 text-xs font-bold">
          {[['Clause 3', '5 months’ rent asked', RED], ['Rule R1', '2 months is the cap', GREEN], ['Locked above the cap', '₹54,000', RED]].map(([k, v, c]) => (
            <span key={k} className="flex items-center gap-2 rounded-full border border-night-line bg-night/70 px-3 py-2 backdrop-blur">
              <span className="h-2 w-2 rounded-full" style={{ background: c }} />
              <span className="text-night-muted">{k}</span> <span className="num font-extrabold text-night-text">{v}</span>
            </span>
          ))}
        </Reveal>
      </div>
    </Chapter>
  )
}

function EvictChapter() {
  return (
    <Chapter id="evict">
      <Kicker n="02">Eviction</Kicker>
      <h2 className="max-w-[12ch] font-display text-[clamp(38px,min(7.4vw,10.7vh),112px)] font-extrabold leading-[0.92] tracking-[-0.045em]">
        <Words text="15 days’ notice." />
        <br />
        <span className="font-serif font-normal italic text-glow-heat"><Words text="Any reason." delay={0.2} /></span>{' '}
        <Words text="Out." delay={0.35} />
      </h2>
      <div className="mt-8 flex max-w-[520px] flex-col items-start gap-6">
        <Reveal delay={0.3} className="text-[17px] font-medium leading-relaxed text-night-text/75">
          Clause 9 lets the landlord end the tenancy whenever they like. Under the model law, a tenant can only be evicted through the Rent Court, on listed grounds. Most tenants never find out.
        </Reveal>
        <Reveal delay={0.45} className="w-full rounded-3xl border border-night-line bg-night-2/80 p-5 backdrop-blur-md">
          <div className="paper-doc rounded-2xl p-4 font-serif text-[17px] leading-snug">
            “The Landlord may terminate this agreement for any reason by giving 15 days’ notice…”
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-danger/20 text-[#E38B93]"><Link2 size={20} /></span>
            <span className="flex flex-col">
              <span className="text-[15px] font-extrabold">Clause 9 ↔ Rule R4</span>
              <span className="text-xs font-bold text-night-muted">No eviction at will · against the model law</span>
            </span>
          </div>
        </Reveal>
      </div>
      <Reveal delay={0.55} className="mt-6 flex flex-wrap gap-2 text-xs font-bold">
        {[[RED, 'Against model law'], [AMBER, 'Unusual'], [GREEN, 'Standard'], [BLUE, 'Missing']].map(([c, l]) => (
          <span key={l} className="flex items-center gap-2 rounded-full border border-night-line bg-night/70 px-3 py-1.5 backdrop-blur"><span className="h-2 w-2 rounded-full" style={{ background: c }} />{l}</span>
        ))}
        <span className="flex items-center rounded-full px-2 py-1.5 text-night-muted">The coins on the scale</span>
      </Reveal>
    </Chapter>
  )
}

const DOC_ROWS = [
  ['3', 'Security deposit', '5× rent · law caps 2×', RED],
  ['5', 'Rent increase', '10% any time, no notice', RED],
  ['6', 'Lock-in', '6 months · common practice', GREEN],
  ['7', 'Repairs', 'Tenant pays structural', AMBER],
  ['9', 'Termination', '15 days, any reason', RED],
]

function ReadChapter() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const rotY = useTransform(scrollYProgress, [0, 0.5, 1], [-38, -14, 12])
  const rotX = useTransform(scrollYProgress, [0, 0.5, 1], [18, 8, -6])
  const lift = useTransform(scrollYProgress, [0, 0.5, 1], [120, 0, -120])
  return (
    <Chapter id="read">
      <div ref={ref} className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <Kicker n="03">Photo in, verdict out</Kicker>
          <h2 className="font-display text-[clamp(35px,min(6.4vw,9.3vh),96px)] font-extrabold leading-[0.92] tracking-[-0.045em]">
            <Words text="Snap the agreement." />
            <br />
            <span className="font-serif font-normal italic text-glow-money"><Words text="We check every clause." delay={0.25} /></span>
          </h2>
          <Reveal delay={0.3} className="mt-8 max-w-[460px] text-[17px] font-medium leading-relaxed text-night-text/75">
            Gemma 4 reads the photo and pulls out every clause. Each one is compared with a written rulebook, and a verifier throws away any rule the model invents.
          </Reveal>
          <Reveal delay={0.45} className="mt-6 flex flex-wrap gap-2">
            {[[ScanLine, 'Reads any photo'], [FileText, '8 rules, 10 must-haves'], [ShieldCheck, 'Every flag cited']].map(([I, t]) => (
              <span key={t} className="flex items-center gap-2 rounded-full border border-night-line bg-night/70 px-3 py-2 text-xs font-bold backdrop-blur"><I size={14} />{t}</span>
            ))}
          </Reveal>
        </div>
        <div className="hidden justify-center lg:flex" style={{ perspective: 1400 }}>
          <motion.div style={{ rotateY: rotY, rotateX: rotX, y: lift, transformStyle: 'preserve-3d' }} className="relative w-[380px]">
            <div className="absolute -inset-8 rounded-[48px] bg-glow-money/10 blur-3xl" />
            <div className="relative rounded-[36px] border border-white/15 bg-paper p-5 text-ink shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
              <div className="mb-4 flex items-center justify-between">
                <span className="num text-lg font-extrabold">Fairness check</span>
                <span className="rounded-full bg-heat-soft px-2.5 py-1 text-[11px] font-extrabold text-heat">41 / 100</span>
              </div>
              <div className="mb-3 rounded-2xl bg-money-soft px-3 py-2.5 text-[13px] font-bold text-[#23513C]">✓ 11 clauses read · 8 citations verified</div>
              <div className="rounded-2xl bg-white px-4">
                {DOC_ROWS.map(([n, t, note, c]) => (
                  <div key={n} className="flex items-center gap-3 border-b border-[#EFEDE7] py-3 last:border-0">
                    <span className="num w-5 text-sm font-extrabold text-muted">{n}</span>
                    <div className="flex flex-1 flex-col">
                      <span className="text-sm font-extrabold">{t}</span>
                      <span className="text-xs font-semibold text-muted">{note}</span>
                    </div>
                    <span className="h-3 w-3 rounded-full" style={{ background: c }} />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex h-13 items-center justify-center rounded-2xl bg-ink text-[15px] font-extrabold text-white">Ask about clause 9</div>
            </div>
          </motion.div>
        </div>
      </div>
    </Chapter>
  )
}

const ANSWER = 'क्लॉज़ 9 के अनुसार मकान मालिक सिर्फ़ 15 दिन के नोटिस पर आपको निकाल सकता है। मॉडल कानून के अनुसार ऐसा केवल रेंट कोर्ट के ज़रिए हो सकता है।'

function VoiceChapter() {
  return (
    <Chapter id="voice">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <Kicker n="04">Voice, in your language</Kicker>
          <h2 className="font-display text-[clamp(35px,min(6.4vw,9.3vh),96px)] font-extrabold leading-[0.92] tracking-[-0.045em]">
            <Words text="Ask in Hindi." />
            <br />
            <span className="font-serif font-normal italic text-glow-heat"><Words text="Hear it in Hindi." delay={0.25} /></span>
          </h2>
          <Reveal delay={0.3} className="mt-8 max-w-[460px] text-[17px] font-medium leading-relaxed text-night-text/75">
            Sarvam AI understands the question in any Indian language and speaks the answer back. Every answer points to the clause and the rule it came from, so you can check it yourself.
          </Reveal>
        </div>
        <Reveal delay={0.2} className="rounded-3xl border border-night-line bg-night-2/90 p-6 backdrop-blur-md">
          <div className="mb-4 flex items-center gap-4 rounded-2xl bg-white/5 p-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-glow-heat text-night"><Mic size={22} /></span>
            <div className="flex-1">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-night-muted">Priya asked</span>
              <p lang="hi" className="mt-0.5 text-[15px] font-semibold">क्या मकान मालिक बिना नोटिस के निकाल सकता है?</p>
            </div>
            <div className="flex h-8 items-center gap-[3px]" aria-hidden="true">
              {Array.from({ length: 14 }, (_, i) => (
                <motion.span key={i} className="w-[3px] rounded-full bg-glow-heat" animate={{ height: [6, 10 + ((i * 7) % 20), 6] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.06 }} />
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-paper p-5 text-ink">
            <div className="mb-2 flex items-center gap-2 text-xs font-extrabold text-muted"><ShieldCheck size={14} /> Answer · cited from your agreement</div>
            <p lang="hi" className="min-h-[96px] text-[15px] font-medium leading-relaxed"><Typewriter text={ANSWER} speed={30} /></p>
            <div className="mt-3 flex gap-2 text-xs font-extrabold">
              <span className="rounded-full bg-danger-soft px-3 py-1.5 text-danger">Clause 9</span>
              <span className="rounded-full bg-money-soft px-3 py-1.5 text-money">Rule R4 · No eviction at will</span>
            </div>
          </div>
        </Reveal>
      </div>
    </Chapter>
  )
}

const LETTER = 'Namaste Suresh ji, thank you for the agreement, I’m happy to go ahead. In line with the national Model Tenancy Act, could we keep the deposit at 2 months (₹36,000), give 3 months’ notice before any rent increase, and remove the 15-day termination clause? Happy to discuss. Thank you! – Priya'

function NegotiateChapter() {
  return (
    <Chapter id="negotiate">
      <div className="max-w-[580px]">
        <Kicker n="05">Act on it</Kicker>
        <h2 className="font-display text-[clamp(35px,min(6.4vw,9.3vh),96px)] font-extrabold leading-[0.92] tracking-[-0.045em]">
          <Words text="Don’t argue." />
          <br />
          <span className="font-serif font-normal italic text-glow-money"><Words text="Negotiate." delay={0.2} /></span>
        </h2>
        <Reveal delay={0.3} className="mt-6 text-[17px] font-medium leading-relaxed text-night-text/75">
          One tap turns every red flag into a polite WhatsApp message citing the law. Watch the scale: <strong className="font-extrabold text-night-text">balance, restored.</strong>
        </Reveal>
        <Reveal delay={0.45} className="mt-6 rounded-3xl border border-night-line bg-night-2/90 p-4 backdrop-blur-md">
          <div className="rounded-2xl bg-[#0b141a] p-3">
            <div className="ml-auto max-w-[96%] rounded-xl rounded-tr-sm bg-[#005c4b] px-4 py-3 text-[14px] font-medium leading-relaxed text-white/95">
              <span className="block min-h-[110px]"><Typewriter text={LETTER} /></span>
              <span className="mt-1 block text-right text-[10px] text-white/50">now ✓✓</span>
            </div>
          </div>
        </Reveal>
      </div>
    </Chapter>
  )
}

function JoinChapter({ onSample, onUpload }) {
  return (
    <section id="join" className="relative flex min-h-screen flex-col justify-center">
      <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-8">
        <Kicker n="06">Free for every tenant</Kicker>
        <h2 className="font-display text-[clamp(45px,min(10vw,14.5vh),160px)] font-extrabold leading-[0.88] tracking-[-0.05em]">
          <Words text="Read it. Check it." />
          <br />
          <span className="font-serif font-normal italic text-glow-heat"><Words text="Sign it fairly." delay={0.2} /></span>
        </h2>
        <Reveal delay={0.35} className="mt-10 flex flex-wrap gap-3">
          <button type="button" onClick={onSample} className="group flex h-14 cursor-pointer items-center gap-2 rounded-full bg-glow-heat px-8 text-base font-extrabold text-night transition hover:brightness-110">
            Browse sample documents <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
          </button>
          <button type="button" onClick={onUpload} className="flex h-14 cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 text-base font-bold backdrop-blur transition hover:bg-white/10">
            <Upload size={18} /> Upload your agreement
          </button>
        </Reveal>
        <Reveal delay={0.45} className="mt-10 grid max-w-[900px] gap-4 sm:grid-cols-3">
          {[
            ['Private by design', 'Gemma 4 is open-weight, so it can run fully offline on a phone. ID numbers are blurred before anything is uploaded.'],
            ['Sarvam voice', 'Ask and listen in 10+ Indian languages.'],
            ['Proof, not opinions', 'Every flag cites a clause and a written rule you can check.'],
          ].map(([h, p]) => (
            <div key={h} className="rounded-2xl border border-night-line bg-night-2/70 p-5 backdrop-blur">
              <p className="text-[15px] font-extrabold">{h}</p>
              <p className="mt-1 text-[13px] font-medium leading-relaxed text-night-muted">{p}</p>
            </div>
          ))}
        </Reveal>
      </div>
      <footer className="mx-auto mt-16 w-full max-w-[1400px] px-5 pb-8 sm:px-8">
        <div className="border-t border-night-line pt-6 text-xs font-semibold text-night-muted">
          Clausewise explains documents; it is not legal advice. Free legal aid: NALSA helpline 15100. Rules are based on the Model Tenancy Act, 2021, which states adopt and modify.
        </div>
      </footer>
    </section>
  )
}
