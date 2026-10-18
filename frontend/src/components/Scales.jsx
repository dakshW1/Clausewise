import { AnimatePresence, motion, useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'

const CX = 200
const CY = 78
const L = 138

// A scale of justice whose beam tilts toward whichever side the agreement favours.
// `angle` > 0 tips the landlord (right) side down. Coins on each pan show what weighs it down.
export default function Scales({ angle = 0, idle = false, tenantCoins = [], landlordCoins = [], labels = [], dark = true, size = 420 }) {
  const a = useSpring(0, { stiffness: 30, damping: 6, mass: 1.2 })

  useEffect(() => {
    if (!idle) {
      a.set(angle)
      return
    }
    let flip = 1
    a.set(6)
    const id = setInterval(() => {
      flip = -flip
      a.set(6 * flip)
    }, 2400)
    return () => clearInterval(id)
  }, [angle, idle, a])

  const rad = useTransform(a, (d) => (d * Math.PI) / 180)
  const lx = useTransform(rad, (r) => CX - L * Math.cos(r))
  const ly = useTransform(rad, (r) => CY - L * Math.sin(r))
  const rx = useTransform(rad, (r) => CX + L * Math.cos(r))
  const ry = useTransform(rad, (r) => CY + L * Math.sin(r))
  const label = dark ? '#EDEBE6' : '#141414'

  return (
    <svg viewBox="0 0 400 340" width="100%" style={{ maxWidth: size }} role="img" aria-label="Scales of justice">
      <defs>
        <linearGradient id="gold" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#FAFAF8" />
          <stop offset="55%" stopColor="#E9E5DC" />
          <stop offset="100%" stopColor="#8E8B83" />
        </linearGradient>
        <radialGradient id="glow">
          <stop offset="0%" stopColor="rgba(233,229,220,0.35)" />
          <stop offset="100%" stopColor="rgba(233,229,220,0)" />
        </radialGradient>
      </defs>

      {dark && <circle cx={CX} cy={CY + 40} r="150" fill="url(#glow)" />}

      <rect x={CX - 5} y={CY} width="10" height="210" rx="5" fill="url(#gold)" />
      <path d={`M${CX - 70} 300 Q${CX} 270 ${CX + 70} 300 Z`} fill="url(#gold)" />
      <rect x={CX - 90} y="298" width="180" height="10" rx="5" fill="url(#gold)" />

      <motion.line x1={lx} y1={ly} x2={rx} y2={ry} stroke="url(#gold)" strokeWidth="7" strokeLinecap="round" />
      <circle cx={CX} cy={CY} r="11" fill={dark ? '#0D0D0E' : '#FFFFFF'} stroke="url(#gold)" strokeWidth="4" />
      <circle cx={CX} cy={CY - 26} r="7" fill="url(#gold)" />
      <path d={`M${CX} ${CY - 19} V${CY - 10}`} stroke="url(#gold)" strokeWidth="4" />

      <Pan x={lx} y={ly} label={labels[0] || 'Tenant'} coins={tenantCoins} color={label} />
      <Pan x={rx} y={ry} label={labels[1] || 'Landlord'} coins={landlordCoins} color={label} />
    </svg>
  )
}

function Pan({ x, y, label, coins, color }) {
  return (
    <motion.g style={{ x, y }}>
      <circle r="5" fill="url(#gold)" />
      <path d="M0 0 L-48 92 M0 0 L48 92" stroke="rgba(233,229,220,0.75)" strokeWidth="1.5" />
      <AnimatePresence>
        {coins.map((c, i) => (
          <motion.circle
            key={c.id}
            cx={-30 + (i % 5) * 15}
            cy={84 - Math.floor(i / 5) * 9}
            r="7"
            fill={c.color}
            stroke="rgba(0,0,0,0.3)"
            initial={{ opacity: 0, y: -90 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ delay: 0.2 + i * 0.1, type: 'spring', stiffness: 260, damping: 14 }}
          />
        ))}
      </AnimatePresence>
      <path d="M-62 92 Q0 132 62 92 Z" fill="url(#gold)" />
      <text y="154" textAnchor="middle" fill={color} fontSize="13" fontWeight="800" letterSpacing="2.5" fontFamily="Manrope, sans-serif">
        {label.toUpperCase()}
      </text>
    </motion.g>
  )
}
