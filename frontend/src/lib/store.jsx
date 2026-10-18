import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from './api'

const Store = createContext(null)
const KEY = 'clausewise-analysis'

function readSaved() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY))
  } catch {
    return null
  }
}

// App-wide state: the current analysis (kept across reloads in sessionStorage), the pending scan job,
// service health, answer language and the clause/rule currently in focus.
export function StoreProvider({ children }) {
  const [analysis, setAnalysisState] = useState(readSaved)
  const [job, setJob] = useState(null)
  const [health, setHealth] = useState(null)
  const [lang, setLang] = useState('hi-IN')
  const [active, setActive] = useState({ clauseIds: [], ruleIds: [], t: 0 })

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth({ gemma: false, sarvam: false }))
  }, [])

  const setAnalysis = useCallback((a) => {
    setAnalysisState(a)
    try {
      if (a) sessionStorage.setItem(KEY, JSON.stringify(a))
      else sessionStorage.removeItem(KEY)
    } catch {
      // storage can be unavailable (private mode); the app still works for this tab
    }
  }, [])

  const focus = useCallback((clauseIds = [], ruleIds = []) => setActive({ clauseIds, ruleIds, t: Date.now() }), [])
  const clearFocus = useCallback(() => setActive({ clauseIds: [], ruleIds: [], t: 0 }), [])

  return (
    <Store.Provider value={{ analysis, setAnalysis, job, setJob, health, lang, setLang, active, focus, clearFocus }}>
      {children}
    </Store.Provider>
  )
}

export const useStore = () => useContext(Store)
