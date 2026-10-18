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

// Suggested questions per document type, in English and Hindi.
const SUGGESTIONS = {
  rent: {
    'en-IN': ['Can the landlord evict me without notice?', 'What happens if I leave early?', 'Will I get my deposit back?', 'Can my rent be increased?'],
    'hi-IN': ['क्या मकान मालिक बिना नोटिस के निकाल सकता है?', 'अगर मैं जल्दी घर छोड़ दूँ तो क्या होगा?', 'क्या मेरा डिपॉज़िट वापस मिलेगा?', 'क्या किराया बढ़ाया जा सकता है?'],
  },
  employment: {
    'en-IN': ['Can they stop me joining a competitor?', 'Do I have to pay the training bond?', 'Can they hold back my salary?', 'Can they change my salary or role?'],
    'hi-IN': ['क्या कंपनी मुझे दूसरी कंपनी में जाने से रोक सकती है?', 'क्या मुझे ट्रेनिंग बॉन्ड के पैसे देने होंगे?', 'क्या कंपनी मेरी सैलरी रोक सकती है?', 'क्या कंपनी मेरी सैलरी या रोल बदल सकती है?'],
  },
  loan: {
    'en-IN': ['What is the real interest rate?', 'Can I close the loan early?', 'Can they call my family?', 'Can the app see my contacts?'],
    'hi-IN': ['असली ब्याज दर कितनी है?', 'क्या लोन जल्दी बंद किया जा सकता है?', 'क्या वे मेरे परिवार को फ़ोन कर सकते हैं?', 'क्या ऐप मेरे कॉन्टैक्ट्स देख सकता है?'],
  },
  freelance: {
    'en-IN': ['When will I get paid?', 'What if they cancel the project?', 'Can I work for other brands?', 'How many revisions do I owe?'],
    'hi-IN': ['मुझे पैसे कब मिलेंगे?', 'अगर क्लाइंट प्रोजेक्ट रद्द कर दे तो क्या होगा?', 'क्या दूसरे ब्रांड्स के लिए काम करना मना है?', 'मुझे कितने बदलाव करने होंगे?'],
  },
  general: {
    'en-IN': ['Can they end this contract any time?', 'Are there hidden charges?', 'Can they change the terms?', 'What am I liable for?'],
    'hi-IN': ['क्या वे यह कॉन्ट्रैक्ट कभी भी खत्म कर सकते हैं?', 'क्या कोई छिपे हुए चार्ज हैं?', 'क्या वे शर्तें बदल सकते हैं?', 'मेरी ज़िम्मेदारी कितनी है?'],
  },
}

export function suggestionsFor(docType, lang) {
  const set = SUGGESTIONS[docType] || SUGGESTIONS.rent
  return set[lang] || set['en-IN']
}

export const rupees = (n) => (n == null ? '–' : '₹' + Math.round(n).toLocaleString('en-IN'))

export function verdict(score, them = 'landlord') {
  const side = them.toLowerCase()
  if (score >= 75) return { text: 'Balanced.', sub: 'This document treats both sides fairly.', color: '#7FD1AE' }
  if (score >= 50) return { text: 'Leaning.', sub: `A few clauses favour the ${side}.`, color: '#E3B95C' }
  return { text: 'Tilted.', sub: `Heavily weighted toward the ${side}.`, color: '#E8798C' }
}

export const scaleAngle = (score) => Math.min(18, Math.max(0, (75 - score) * 0.45))
