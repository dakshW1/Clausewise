import { AnimatePresence } from 'framer-motion'
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Landing from './components/Landing'
import Scanning from './components/Scanning'
import { StoreProvider, useStore } from './lib/store'
import AskPage from './pages/AskPage'
import ClausesPage from './pages/ClausesPage'
import NegotiatePage from './pages/NegotiatePage'
import OverviewPage from './pages/OverviewPage'
import ProofPage from './pages/ProofPage'
import ReportLayout from './pages/ReportLayout'
import TimelinePage from './pages/TimelinePage'

function Home() {
  const { setJob } = useStore()
  const navigate = useNavigate()
  return <Landing onStart={(file) => { setJob({ file }); navigate('/scan') }} />
}

function AnimatedRoutes() {
  const location = useLocation()
  // Animate between top-level screens only; report tabs animate inside their own layout.
  const top = location.pathname.startsWith('/report') ? '/report' : location.pathname
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={top}>
        <Route path="/" element={<Home />} />
        <Route path="/scan" element={<Scanning />} />
        <Route path="/report" element={<ReportLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="clauses" element={<ClausesPage />} />
          <Route path="proof" element={<ProofPage />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="ask" element={<AskPage />} />
          <Route path="negotiate" element={<NegotiatePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <HashRouter>
      <StoreProvider>
        <AnimatedRoutes />
      </StoreProvider>
    </HashRouter>
  )
}
