import { animate, motion, useInView } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

export const EASE = [0.16, 1, 0.3, 1]

export function Reveal({ children, delay = 0, className, y = 40, once = false }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: 'blur(10px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ amount: 0.4, once }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

// Headline that rises in word by word, like a title sequence.
// The trigger lives on the wrapper: the words start clipped out of view, so they can't observe themselves.
export function Words({ text, className, delay = 0, stagger = 0.06 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { amount: 0.3 })
  const words = text.split(' ')
  return (
    <span ref={ref} className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} className={`inline-block overflow-hidden pb-[0.08em] align-bottom ${i < words.length - 1 ? 'mr-[0.24em]' : ''}`} aria-hidden="true">
          <motion.span
            className="inline-block"
            initial={{ y: '110%', rotate: 4 }}
            animate={inView ? { y: '0%', rotate: 0 } : { y: '110%', rotate: 4 }}
            transition={{ duration: 0.85, ease: EASE, delay: inView ? delay + i * stagger : 0 }}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </span>
  )
}

export function CountTo({ from = 0, to, prefix = '', suffix = '', className, duration = 1.6, delay = 0.3, onMount = false }) {
  const ref = useRef(null)
  const seen = useInView(ref, { amount: 0.6 })
  const inView = onMount || seen
  const [value, setValue] = useState(from)
  useEffect(() => {
    if (!inView) return
    // Drive React state (not a motion value) so the text updates even when animation frames are throttled.
    const controls = animate(from, to, { duration, delay, ease: EASE, onUpdate: (v) => setValue(v) })
    const settle = setTimeout(() => { controls.stop(); setValue(to) }, (delay + duration) * 1000 + 150)
    return () => { controls.stop(); clearTimeout(settle) }
  }, [inView, from, to, duration, delay])
  return <span ref={ref} className={className}>{`${prefix}${Math.round(value).toLocaleString('en-IN')}${suffix}`}</span>
}

export function Typewriter({ text, className, speed = 14, start = true }) {
  const ref = useRef(null)
  const inView = useInView(ref, { amount: 0.5, once: true })
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!inView || !start) return
    setN(0)
    const id = setInterval(() => setN((v) => (v >= text.length ? v : v + 2)), speed)
    return () => clearInterval(id)
  }, [inView, text, speed, start])
  return (
    <span ref={ref} className={className}>
      {text.slice(0, n)}
      {n < text.length && <span className="caret ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-current" />}
    </span>
  )
}

export function Kicker({ n, children, dark = true }) {
  return (
    <Reveal y={16} className={`mb-6 flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.2em] ${dark ? 'text-night-muted' : 'text-muted'}`}>
      <span className={`num ${dark ? 'text-glow-heat' : 'text-heat'}`}>{n}</span>
      <span className={`h-px w-10 ${dark ? 'bg-white/25' : 'bg-ink/20'}`} />
      {children}
    </Reveal>
  )
}

export function PulseDot({ color = 'var(--glow-heat)', size = 8 }) {
  return (
    <span className="relative flex" style={{ width: size, height: size }}>
      <span className="pulse-ring absolute inline-flex h-full w-full rounded-full" style={{ background: color }} />
      <span className="relative inline-flex rounded-full" style={{ width: size, height: size, background: color }} />
    </span>
  )
}
