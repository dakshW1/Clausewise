async function json(res) {
  if (!res.ok) {
    // FastAPI puts a readable reason in "detail"; show that instead of a bare status code.
    const detail = await res.json().then((b) => b.detail).catch(() => null)
    throw new Error(detail || `${res.status} ${res.statusText}`)
  }
  return res.json()
}

const send = (method, url, body) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(json)

export const api = {
  health: () => fetch('/api/health').then(json),

  samples: () => fetch('/api/samples').then(json),
  sampleText: (id) => fetch(`/api/samples/${id}`).then(json),

  analyze: (file, sampleId = 'rent') => {
    const form = new FormData()
    if (file) form.append('file', file)
    else form.append('sample_id', sampleId)
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

  cases: () => fetch('/api/cases').then(json),
  getCase: (id) => fetch(`/api/cases/${id}`).then(json),
  createCase: (analysis) => send('POST', '/api/cases', { analysis }),
  addVersion: (id, analysis) => send('POST', `/api/cases/${id}/versions`, { analysis }),
  addEvent: (id, kind, text) => send('POST', `/api/cases/${id}/events`, { kind, text }),
  setOutcome: (id, clauseId, status, note = '') => send('PUT', `/api/cases/${id}/clauses/${clauseId}`, { status, note }),
  setStatus: (id, status) => send('PATCH', `/api/cases/${id}`, { status }),
  deleteCase: (id) => fetch(`/api/cases/${id}`, { method: 'DELETE' }).then(json),

  speak: (text, language_code) => send('POST', '/api/speak', { text, language_code }),
  explain: (analysis, level) => send('POST', '/api/explain', { analysis, level }),
  checklist: (analysis) => send('POST', '/api/checklist', { analysis }),
  debate: (analysis) => send('POST', '/api/debate', { analysis }),
  summary: (analysis, language_code) => send('POST', '/api/summary', { analysis, language_code }),
  recheck: (analysis, corrections) => send('POST', '/api/recheck', { analysis, corrections }),

  negotiate: (language_code, analysis) =>
    fetch('/api/negotiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language_code, analysis }),
    }).then(json),
}
