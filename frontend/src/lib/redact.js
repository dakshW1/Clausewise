// The same ID patterns the backend masks, applied before text leaves the browser.
const PATTERNS = [
  [/\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[Aadhaar hidden]'],
  [/\b[A-Z]{5}\d{4}[A-Z]\b/g, '[PAN hidden]'],
  [/(?:\+91[\s-]?)?\b[6-9]\d{9}\b/g, '[phone hidden]'],
]

export function redactText(text) {
  let hidden = 0
  let out = text
  for (const [re, mask] of PATTERNS) out = out.replace(re, () => { hidden += 1; return mask })
  return { text: out, hidden }
}
