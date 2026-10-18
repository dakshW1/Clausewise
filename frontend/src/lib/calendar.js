// Key dates of a rent agreement, and an .ics file so they land in the user's calendar.

const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
const addMonths = (d, m) => new Date(d.getFullYear(), d.getMonth() + m, d.getDate())

function rentDueDay(analysis) {
  if (analysis.key_values?.rent_due_day) return analysis.key_values.rent_due_day
  const rent = analysis.clauses.find((c) => c.category === 'rent')
  const m = rent?.text.match(/(\d{1,2})(?:st|nd|rd|th)\s+(?:day|of)/i)
  return m ? Number(m[1]) : null
}

export function keyDates(analysis) {
  const kv = analysis.key_values || {}
  if (!kv.start_date) return []
  const start = new Date(kv.start_date + 'T00:00:00')
  const term = kv.term_months || 11
  const dates = []
  const due = rentDueDay(analysis)
  if (due) {
    const first = new Date(start.getFullYear(), start.getMonth(), due)
    dates.push({ key: 'rent', title: 'Rent due', detail: `₹${(kv.rent || 0).toLocaleString('en-IN')} every month`, date: first < start ? addMonths(first, 1) : first, repeat: term })
  }
  if (kv.lock_in_months) dates.push({ key: 'lockin', title: 'Lock-in ends', detail: 'You can leave without the penalty', date: addMonths(start, kv.lock_in_months) })
  if (kv.tenant_notice_days) {
    const months = Math.round(kv.tenant_notice_days / 30)
    dates.push({ key: 'notice', title: 'Give notice by', detail: `${months} months' notice to leave at the end`, date: addMonths(start, term - months) })
  }
  dates.push({ key: 'end', title: 'Agreement ends', detail: 'Ask for your deposit back', date: addMonths(start, term) })
  return dates.sort((a, b) => a.date - b.date)
}

export function downloadIcs(analysis, dates) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const events = dates.map((d) => [
    'BEGIN:VEVENT',
    `UID:${d.key}-${ymd(d.date)}@clausewise`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${ymd(d.date)}`,
    `DTEND;VALUE=DATE:${ymd(new Date(d.date.getTime() + 86400000))}`,
    ...(d.repeat ? [`RRULE:FREQ=MONTHLY;COUNT=${d.repeat}`] : []),
    `SUMMARY:${d.title} · ${analysis.title}`.slice(0, 120),
    `DESCRIPTION:${d.detail}. Added by Clausewise.`,
    'BEGIN:VALARM', 'TRIGGER:-P2D', 'ACTION:DISPLAY', `DESCRIPTION:${d.title}`, 'END:VALARM',
    'END:VEVENT',
  ].join('\r\n'))
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Clausewise//Key dates//EN', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: 'clausewise-key-dates.ics' })
  a.click()
  URL.revokeObjectURL(url)
}
