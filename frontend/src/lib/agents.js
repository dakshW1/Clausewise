import { Eye, Scale, SearchX, ShieldCheck, User } from 'lucide-react'

// The four stages of the analysis pipeline, shown as agents passing messages.
// `color` reads on night backgrounds, `ink` on light cards.
export const AGENTS = {
  Reader: { icon: Eye, color: '#9DB4D8', ink: '#3D5A80', role: 'Gemma 4 · reads the document', working: 'Reading every clause…' },
  'Law Checker': { icon: Scale, color: '#D9B56E', ink: '#6E4E12', role: 'Gemma 4 · compares with the rulebook', working: 'Comparing clauses with the rulebook…' },
  'Gap Finder': { icon: SearchX, color: '#B8B0D8', ink: '#5A5280', role: 'Gemma 4 · checks the must-haves', working: 'Looking for what is missing…' },
  Verifier: { icon: ShieldCheck, color: '#8FCBA8', ink: '#2F6B4F', role: 'Code · checks every citation', working: 'Making sure every rule cited is real…' },
  You: { icon: User, color: '#EDEBE6', ink: '#141414', role: 'Tenant' },
}

export const PIPELINE = ['Reader', 'Law Checker', 'Gap Finder', 'Verifier']
