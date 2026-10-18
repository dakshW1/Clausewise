import { Eye, Scale, SearchX, ShieldCheck, User } from 'lucide-react'

// The four stages of the analysis pipeline, shown as agents passing messages.
// `color` reads on night backgrounds, `ink` on light cards.
export const AGENTS = {
  Reader: { icon: Eye, color: '#93AEDB', ink: '#3A5A8C', role: 'Gemma 4 · reads the document', working: 'Reading every clause…' },
  'Law Checker': { icon: Scale, color: '#E3B95C', ink: '#7A5512', role: 'Gemma 4 · compares with 8 rules', working: 'Comparing clauses with the rulebook…' },
  'Gap Finder': { icon: SearchX, color: '#B9A5E6', ink: '#5B4A94', role: 'Gemma 4 · checks 10 must-haves', working: 'Looking for what is missing…' },
  Verifier: { icon: ShieldCheck, color: '#7FD1AE', ink: '#1F6F55', role: 'Code · checks every citation', working: 'Making sure every rule cited is real…' },
  You: { icon: User, color: '#EEEAE0', ink: '#12141F', role: 'Tenant' },
}

export const PIPELINE = ['Reader', 'Law Checker', 'Gap Finder', 'Verifier']
