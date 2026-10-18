// Each severity has a colour for light cards, a glow for night cards, and a soft tint for backgrounds.
export const SEVERITY = {
  red: { color: '#A3243B', glow: '#E8798C', soft: '#F7E4E7', text: '#8A1C30', label: 'Against model law', short: 'Unfair' },
  amber: { color: '#C08A1E', glow: '#E3B95C', soft: '#F8EED6', text: '#7A5512', label: 'Unusual', short: 'Unusual' },
  green: { color: '#1F6F55', glow: '#7FD1AE', soft: '#E3EFE8', text: '#174F3D', label: 'Standard', short: 'Fair' },
  missing: { color: '#3A5A8C', glow: '#93AEDB', soft: '#E6ECF5', text: '#2D4670', label: 'Missing', short: 'Missing' },
}

export const LANGUAGES = [
  { code: 'en-IN', label: 'English', native: 'English' },
  { code: 'hi-IN', label: 'Hindi', native: 'हिंदी' },
  { code: 'ta-IN', label: 'Tamil', native: 'தமிழ்' },
  { code: 'kn-IN', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'bn-IN', label: 'Bengali', native: 'বাংলা' },
]

export const SUGGESTIONS = {
  'en-IN': [
    'Can the landlord evict me without notice?',
    'What happens if I leave early?',
    'Will I get my deposit back?',
    'Can my rent be increased?',
  ],
  'hi-IN': [
    'क्या मकान मालिक बिना नोटिस के निकाल सकता है?',
    'अगर मैं जल्दी घर छोड़ दूँ तो क्या होगा?',
    'क्या मेरा डिपॉज़िट वापस मिलेगा?',
    'क्या किराया बढ़ाया जा सकता है?',
  ],
}

export const rupees = (n) => (n == null ? '–' : '₹' + Math.round(n).toLocaleString('en-IN'))

export function verdict(score) {
  if (score >= 75) return { text: 'Balanced.', sub: 'This agreement treats both sides fairly.', color: '#7FD1AE' }
  if (score >= 50) return { text: 'Leaning.', sub: 'A few clauses favour the landlord.', color: '#E3B95C' }
  return { text: 'Tilted.', sub: 'Heavily weighted toward the landlord.', color: '#E8798C' }
}

export const scaleAngle = (score) => Math.min(18, Math.max(0, (75 - score) * 0.45))
