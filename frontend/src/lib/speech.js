// Plays Sarvam audio when the backend returns it, otherwise falls back to the browser's own voices.
export function speak(text, lang, audioBase64, { onStart, onEnd } = {}) {
  stopSpeaking()
  if (audioBase64) {
    const audio = new Audio(`data:audio/wav;base64,${audioBase64}`)
    current = audio
    audio.onplay = onStart
    audio.onended = onEnd
    audio.onerror = onEnd
    audio.play().catch(() => onEnd?.())
    return
  }
  if (!('speechSynthesis' in window)) return onEnd?.()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  const voice = speechSynthesis.getVoices().find((v) => v.lang.replace('_', '-').startsWith(lang.slice(0, 2)))
  if (voice) u.voice = voice
  u.rate = 0.98
  u.onstart = onStart
  u.onend = onEnd
  u.onerror = onEnd
  speechSynthesis.speak(u)
}

let current = null

export function stopSpeaking() {
  if (current) {
    current.pause()
    current = null
  }
  if ('speechSynthesis' in window) speechSynthesis.cancel()
}

export const browserRecognition = () => window.SpeechRecognition || window.webkitSpeechRecognition
