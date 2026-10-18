import { AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import Dashboard from './components/Dashboard'
import Landing from './components/Landing'
import NegotiateModal from './components/NegotiateModal'
import Scanning from './components/Scanning'
import { api } from './lib/api'

const MIN_SCAN_MS = 3800
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export default function App() {
  const [stage, setStage] = useState('hero')
  const [file, setFile] = useState(null)
  const [sampleText, setSampleText] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [scanDone, setScanDone] = useState(false)
  const [health, setHealth] = useState(null)
  const [lang, setLang] = useState('hi-IN')
  const [active, setActive] = useState({ clauseIds: [], ruleIds: [], t: 0 })
  const [negotiating, setNegotiating] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth({ gemma: false, sarvam: false }))
    fetch('/api/sample').then((r) => r.json()).then((d) => setSampleText(d.text)).catch(() => {})
  }, [])

  async function start(f) {
    setError(null)
    setFile(f)
    setScanDone(false)
    setStage('scan')
    try {
      const [result] = await Promise.all([api.analyze(f), wait(MIN_SCAN_MS)])
      setAnalysis(result)
      setScanDone(true)
      await wait(700)
      window.scrollTo(0, 0)
      setStage('result')
    } catch (e) {
      setError(`Could not analyse the document: ${e.message}. Is the backend running?`)
      setStage('hero')
    }
  }

  const focus = useCallback((clauseIds = [], ruleIds = []) => setActive({ clauseIds, ruleIds, t: Date.now() }), [])

  return (
    <>
      {error && <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-danger px-5 py-2.5 text-sm font-extrabold text-white shadow-lg">{error}</div>}
      <AnimatePresence mode="wait">
        {stage === 'hero' && <Landing key="hero" onStart={start} />}
        {stage === 'scan' && <Scanning key="scan" file={file} sampleText={sampleText} done={scanDone} />}
        {stage === 'result' && analysis && (
          <Dashboard
            key="dash"
            analysis={analysis}
            health={health}
            lang={lang}
            setLang={setLang}
            active={active}
            onFocus={focus}
            onReset={() => { window.scrollTo(0, 0); setStage('hero'); setAnalysis(null); setActive({ clauseIds: [], ruleIds: [], t: 0 }) }}
            onNegotiate={() => setNegotiating(true)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {negotiating && analysis && <NegotiateModal analysis={analysis} lang={lang} onClose={() => setNegotiating(false)} />}
      </AnimatePresence>
    </>
  )
}
