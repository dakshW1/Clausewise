async function json(res) {
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export const api = {
  health: () => fetch('/api/health').then(json),

  analyze: (file) => {
    const form = new FormData()
    if (file) form.append('file', file)
    else form.append('sample', 'true')
    return fetch('/api/analyze', { method: 'POST', body: form }).then(json)
  },

  voice: (blob) => {
    const form = new FormData()
    form.append('file', blob, 'question.webm')
    return fetch('/api/voice', { method: 'POST', body: form }).then(json)
  },

  ask: (question, language_code, analysis) =>
    fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, language_code, analysis }),
    }).then(json),

  negotiate: (language_code, analysis) =>
    fetch('/api/negotiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language_code, analysis }),
    }).then(json),
}
