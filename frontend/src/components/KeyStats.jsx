import { rupees } from '../lib/theme'
import { CountTo } from './motion-bits'
import { Card, CardHead } from './ui'

function Line({ k, v, bad = false, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full cursor-pointer justify-between gap-3 border-b border-line py-1.5 text-left transition hover:text-ink">
      <dt className="text-ink-2">{k}</dt>
      <dd className={`num font-extrabold ${bad ? 'text-danger' : ''}`}>{v}</dd>
    </button>
  )
}

// "What you're asked vs what the law allows", in the same shape as a struck-out price and the real one.
export default function KeyStats({ analysis, onFocus }) {
  const kv = analysis.key_values
  const clause = (cat) => analysis.clauses.find((c) => c.category === cat)
  const focus = (cat) => () => { const c = clause(cat); if (c) onFocus([c.id], c.rule_id ? [c.rule_id] : []) }
  const fair = kv.rent ? Math.min(kv.deposit ?? Infinity, 2 * kv.rent) : null

  return (
    <Card className="lg:col-span-5" delay={0.05}>
      <CardHead title="Your deposit vs the law" sub={kv.deposit_months ? `${kv.deposit_months}× monthly rent` : null} />
      {kv.deposit && fair != null && (
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={focus('deposit')} className="cursor-pointer rounded-2xl bg-paper p-4 text-left">
            <p className="text-xs font-bold text-muted">The landlord asks</p>
            <p className={`num text-[30px] font-extrabold leading-tight text-muted ${kv.deposit > fair ? 'line-through decoration-danger decoration-[3px]' : ''}`}>{rupees(kv.deposit)}</p>
          </button>
          <button type="button" onClick={focus('deposit')} className="cursor-pointer rounded-2xl bg-ink p-4 text-left text-white">
            <p className="text-xs font-bold text-white/70">The model law allows</p>
            <p className="num text-[30px] font-extrabold leading-tight text-glow-money"><CountTo from={kv.deposit} to={fair} prefix="₹" onMount /></p>
          </button>
        </div>
      )}
      <dl className="mt-4 flex flex-col text-sm font-semibold">
        {kv.rent != null && <Line k="Monthly rent" v={rupees(kv.rent)} onClick={focus('rent')} />}
        {kv.rent_increase_pct != null && <Line k="Rent can rise, any time" v={`+${kv.rent_increase_pct}%`} bad={clause('rent_revision')?.severity === 'red'} onClick={focus('rent_revision')} />}
        {kv.lock_in_months != null && <Line k="Lock-in" v={`${kv.lock_in_months} months`} onClick={focus('lock_in')} />}
        {kv.landlord_notice_days != null && <Line k="Landlord’s notice to evict" v={`${kv.landlord_notice_days} days`} bad={clause('eviction')?.severity === 'red'} onClick={focus('eviction')} />}
        {kv.tenant_notice_days != null && <Line k="Your notice to leave" v={`${kv.tenant_notice_days} days`} onClick={focus('notice')} />}
      </dl>
    </Card>
  )
}
