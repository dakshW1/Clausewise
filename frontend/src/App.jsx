import { AnimatePresence } from 'framer-motion'
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Landing from './components/Landing'
import Scanning from './components/Scanning'
import { StoreProvider, useStore } from './lib/store'
import AskPage from './pages/AskPage'
import CasePage from './pages/CasePage'
import ChecklistPage from './pages/ChecklistPage'
import ClausesPage from './pages/ClausesPage'
import HistoryPage from './pages/HistoryPage'
import NegotiatePage from './pages/NegotiatePage'
import OverviewPage from './pages/OverviewPage'
import PreparePage from './pages/PreparePage'
import PicturesPage from './pages/PicturesPage'
import ProofPage from './pages/ProofPage'
import ReportLayout from './pages/ReportLayout'
import SamplesPage from './pages/SamplesPage'
import TimelinePage from './pages/TimelinePage'

function Home() {
  const { setJob } = useStore()
  const navigate = useNavigate()
  // A photo goes through the redaction step first; the sample goes straight to scanning.
  return <Landing onStart={(file) => { setJob({ file }); navigate(file ? '/prepare' : '/scan') }} onBrowse={() => navigate('/samples')} />
}

function AnimatedRoutes() {
  const location = useLocation()
  // Animate between top-level screens only; report tabs animate inside their own layout.
  const top = location.pathname.startsWith('/report') ? '/report' : location.pathname
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={top}>
        <Route path="/" element={<Home />} />
        <Route path="/samples" element={<SamplesPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/history/:id" element={<CasePage />} />
        <Route path="/prepare" element={<PreparePage />} />
        <Route path="/scan" element={<Scanning />} />
        <Route path="/report" element={<ReportLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="clauses" element={<ClausesPage />} />
          <Route path="pictures" element={<PicturesPage />} />
          <Route path="proof" element={<ProofPage />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="ask" element={<AskPage />} />
          <Route path="negotiate" element={<NegotiatePage />} />
          <Route path="checklist" element={<ChecklistPage />} />
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
