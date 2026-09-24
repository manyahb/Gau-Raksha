import { useState, useEffect } from 'react'
import { financeAPI } from '../services/api'

export default function Finance() {
  const [tab, setTab]         = useState('dashboard')
  const [dashboard, setDash]  = useState(null)
  const [ranking, setRanking] = useState([])
  const [rankPeriod, setRankPeriod] = useState('month')
  const [cowStats, setCowStats] = useState(null)
  const [selectedCow, setSelectedCow] = useState('')
  const [dailyReport, setDailyReport] = useState(null)
  const [plReport, setPlReport] = useState(null)
  const [ledger, setLedger]   = useState([])
  const [forecast, setForecast] = useState([])
  const [expForm, setExpForm] = useState({ cattle_id:'', record_type:'feed', description:'', amount:'' })
  const [saleForm, setSaleForm] = useState({ cattle_id:'', litres:'', price_per_litre:'', buyer_name:'' })
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')

  const load = () => {
    financeAPI.getDashboard().then(r => setDash(r.data)).catch(()=>{})
    financeAPI.getLedger().then(r => setLedger(r.data||[])).catch(()=>{})
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    financeAPI.getRanking(rankPeriod).then(r => setRanking(r.data.animals||[])).catch(()=>{})
  }, [rankPeriod])

  const loadCowStats = async () => {
    if (!selectedCow) return alert('Enter a Cattle ID')
    try { const r = await financeAPI.getCowStats(parseInt(selectedCow)); setCowStats(r.data) }
    catch(e) { alert(e.response?.data?.detail || 'Cattle not found') }
  }

  const loadDailyReport = async () => {
    try { const r = await financeAPI.getDailyReport(); setDailyReport(r.data) }
    catch { setDailyReport(null) }
  }

  const loadPL = async () => {
    try { const r = await financeAPI.getPLReport(); setPlReport(r.data) }
    catch { setPlReport(null) }
  }

  const loadForecast = async () => {
    try { const r = await financeAPI.getForecast(); setForecast(r.data.forecast||[]) }
    catch { setForecast([]) }
  }

  const saveExpense = async () => {
    if (!expForm.description || !expForm.amount) return alert('Fill description and amount')
    setSaving(true)
    try {
      await financeAPI.addExpense({ ...expForm, cattle_id: expForm.cattle_id ? parseInt(expForm.cattle_id) : null, amount: parseFloat(expForm.amount) })
      setMsg('✅ Expense saved!'); load()
      setExpForm({ cattle_id:'', record_type:'feed', description:'', amount:'' })
    } catch { setMsg('❌ Error saving') }
    setSaving(false); setTimeout(() => setMsg(''), 3000)
  }

  const saveSale = async () => {
    if (!saleForm.litres || !saleForm.price_per_litre) return alert('Fill litres and price')
    setSaving(true)
    try {
      await financeAPI.addMilkSale({ ...saleForm, cattle_id: saleForm.cattle_id ? parseInt(saleForm.cattle_id) : null, litres: parseFloat(saleForm.litres), price_per_litre: parseFloat(saleForm.price_per_litre) })
      setMsg('✅ Sale recorded!'); load()
      setSaleForm({ cattle_id:'', litres:'', price_per_litre:'', buyer_name:'' })
    } catch { setMsg('❌ Error saving') }
    setSaving(false); setTimeout(() => setMsg(''), 3000)
  }

  const medal = ['🏆','🥈','🥉']

  return (
    <div style={{ padding:'clamp(1rem,3vw,2rem)', maxWidth:1160, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom:'2rem' }} className="animate-fade-up">
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'5px 16px',
          borderRadius:24, background:'rgba(127,119,221,0.10)', border:'1px solid rgba(127,119,221,0.26)',
          fontFamily:'JetBrains Mono, monospace', fontSize:10.5, letterSpacing:'0.13em',
          color:'var(--purple)', textTransform:'uppercase', marginBottom:'1rem' }}>
          Module 04
        </div>
        <h1 className="font-display" style={{ fontSize:'clamp(26px,4.5vw,36px)', fontWeight:800,
          color:'var(--text)', letterSpacing:'-0.027em', lineHeight:1.08, marginBottom:'0.6rem' }}>
          Farm Finance Manager
        </h1>
        <p style={{ fontSize:14, color:'var(--text2)' }}>
          Auto-collects from all modules · Cow ranking · Per-cow P&amp;L · Daily report · Price forecast
        </p>
      </div>

      {/* Dashboard summary cards */}
      {dashboard && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:'1.75rem' }}>
          {[
            { label:"Today's Income",    val:`₹${dashboard.today?.income||0}`,        color:'var(--green)'  },
            { label:"Today's Expenses",  val:`₹${dashboard.today?.expenses||0}`,      color:'var(--red)'    },
            { label:'Month Income',      val:`₹${dashboard.this_month?.income||0}`,   color:'var(--green)'  },
            { label:'Month Expenses',    val:`₹${dashboard.this_month?.expenses||0}`, color:'var(--red)'    },
            { label:'Month Net',         val:`₹${dashboard.this_month?.net||0}`,      color: (dashboard.this_month?.net||0)>=0 ? 'var(--green)' : 'var(--red)' },
            { label:'Total Milk (L)',    val: dashboard.total_milk_litres||0,          color:'var(--blue)'   },
          ].map(({ label, val, color }) => (
            <div key={label} className="card" style={{ padding:'1rem', textAlign:'center' }}>
              <div style={{ fontSize:20, fontWeight:700, color }}>{val}</div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:'1.75rem', flexWrap:'wrap' }}>
        {[
          ['dashboard','📊 Dashboard'],
          ['ranking',  '🏆 Cow Ranking'],
          ['cow',      '🐄 Cow Stats'],
          ['daily',    '📅 Daily Report'],
          ['pl',       '📈 P&L Report'],
          ['forecast', '🔮 Price Forecast'],
          ['add',      '➕ Add Entry'],
        ].map(([id,label]) => (
          <button key={id} onClick={() => {
            setTab(id)
            if (id==='daily') loadDailyReport()
            if (id==='pl')    loadPL()
            if (id==='forecast') loadForecast()
          }} className={`module-tab${tab===id?' active':''}`}>{label}</button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {tab === 'dashboard' && (
        <div className="animate-fade-up">
          <div className="card" style={{ overflowX:'auto' }}>
            <p style={{ fontWeight:600, marginBottom:12 }}>Recent Transactions</p>
            {ledger.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">💰</div><p>No transactions yet</p></div>
            ) : (
              <table>
                <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Cow</th><th>Amount</th></tr></thead>
                <tbody>
                  {ledger.slice(0,20).map(r => (
                    <tr key={r.id}>
                      <td style={{ fontSize:11, color:'var(--text3)' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                      <td><span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                        background:'var(--bg2)', border:'1px solid var(--border)' }}>{r.record_type}</span></td>
                      <td style={{ fontSize:13, color:'var(--text2)', maxWidth:240 }}>{r.description}</td>
                      <td style={{ fontSize:12 }}>{r.cattle_id ? `#${r.cattle_id}` : 'Farm'}</td>
                      <td style={{ fontWeight:600, color: r.amount>=0 ? 'var(--green)' : 'var(--red)' }}>
                        {r.amount>=0 ? '+' : ''}₹{Math.abs(r.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── RANKING ── */}
      {tab === 'ranking' && (
        <div className="animate-fade-up">
          <div style={{ display:'flex', gap:8, marginBottom:'1.25rem', flexWrap:'wrap', alignItems:'center' }}>
            <p style={{ fontWeight:600, flex:1 }}>Cow Profitability Leaderboard</p>
            {['today','month','all'].map(p => (
              <button key={p} onClick={() => setRankPeriod(p)}
                style={{ padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:500, border:'none', cursor:'pointer',
                  background: rankPeriod===p ? 'var(--green)' : 'var(--bg2)',
                  color: rankPeriod===p ? '#fff' : 'var(--text2)' }}>
                {p==='today' ? 'Today' : p==='month' ? 'This Month' : 'All Time'}
              </button>
            ))}
          </div>
          {ranking.length === 0 ? (
            <div className="card"><div className="empty-state"><div className="empty-icon">🏆</div><p>No data yet — add some sales first</p></div></div>
          ) : (
            <div style={{ display:'grid', gap:10 }}>
              {ranking.map((cow, i) => (
                <div key={cow.cattle_id} className="card" style={{ display:'flex', alignItems:'center', gap:16, padding:'1rem 1.25rem',
                  border: i===0 ? '1.5px solid rgba(34,201,122,0.4)' : undefined }}>
                  <div style={{ fontSize:28, flexShrink:0 }}>{medal[i] || `#${cow.rank}`}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
                      <div>
                        <p style={{ fontWeight:700, fontSize:15, color:'var(--text)', marginBottom:2 }}>
                          {cow.name || `Cow #${cow.cattle_id}`}
                          <span style={{ fontSize:11, color:'var(--text3)', fontFamily:'JetBrains Mono,monospace', marginLeft:8 }}>{cow.tag_number}</span>
                        </p>
                        <p style={{ fontSize:12, color:'var(--text3)' }}>{cow.breed} · {cow.farm_node} · {cow.total_litres}L milk</p>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <p style={{ fontSize:20, fontWeight:800, color: cow.net_profit>=0 ? 'var(--green)' : 'var(--red)' }}>
                          {cow.net_profit>=0 ? '+' : ''}₹{Math.abs(cow.net_profit).toFixed(0)}
                        </p>
                        <p style={{ fontSize:11, color:'var(--text3)' }}>net profit</p>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:16, marginTop:8, flexWrap:'wrap' }}>
                      <span style={{ fontSize:12, color:'var(--green)' }}>Income: ₹{cow.income.toFixed(0)}</span>
                      <span style={{ fontSize:12, color:'var(--red)' }}>Expenses: ₹{cow.expenses.toFixed(0)}</span>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                        background: cow.verdict==='keep' ? 'var(--green-dim)' : cow.verdict==='monitor' ? 'var(--amber-dim)' : 'var(--red-dim)',
                        color: cow.verdict==='keep' ? 'var(--green)' : cow.verdict==='monitor' ? 'var(--amber)' : 'var(--red)' }}>
                        {cow.verdict==='keep' ? '✓ Keep' : cow.verdict==='monitor' ? '⚠ Monitor' : '⚡ Consider selling'}
                      </span>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99, background:'var(--bg2)', color:'var(--text3)' }}>
                        {cow.health_status==='high' ? '🔴' : cow.health_status==='medium' ? '🟡' : '🟢'} {cow.health_status} health
                      </span>
                    </div>
                  </div>
                  <button className="btn-ghost" style={{ padding:'6px 12px', fontSize:12, flexShrink:0 }}
                    onClick={() => { setSelectedCow(String(cow.cattle_id)); setTab('cow'); }}>
                    View stats →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── COW STATS ── */}
      {tab === 'cow' && (
        <div className="animate-fade-up">
          <div style={{ display:'flex', gap:10, marginBottom:'1.25rem', alignItems:'flex-end' }}>
            <div style={{ flex:1, maxWidth:200 }}>
              <label style={{ fontSize:11, color:'var(--text3)', display:'block', marginBottom:4 }}>Cattle ID</label>
              <input type="number" placeholder="e.g. 3" value={selectedCow} onChange={e => setSelectedCow(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={loadCowStats}>Load Statistics</button>
          </div>
          {cowStats && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:'1.25rem' }}>

              {/* Summary */}
              <div className="card" style={{ padding:'1.5rem' }}>
                <p style={{ fontWeight:700, fontSize:16, color:'var(--text)', marginBottom:4 }}>{cowStats.name || `Cow #${cowStats.cattle_id}`}</p>
                <p style={{ fontSize:12, color:'var(--text3)', marginBottom:'1.25rem' }}>{cowStats.breed} · Age {cowStats.age_years}y · {cowStats.farm_node}</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {[
                    { label:'Total Income',   val:`₹${cowStats.financial_summary.total_income}`, color:'var(--green)' },
                    { label:'Total Expenses', val:`₹${cowStats.financial_summary.total_expenses}`, color:'var(--red)' },
                    { label:'Net Profit',     val:`₹${cowStats.financial_summary.net_profit}`, color: cowStats.financial_summary.profitable ? 'var(--green)' : 'var(--red)' },
                    { label:'Total Milk',     val:`${cowStats.financial_summary.total_litres}L`, color:'var(--blue)' },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ padding:'10px 14px', borderRadius:8, background:'var(--bg2)', border:'1px solid var(--border)' }}>
                      <p style={{ fontSize:18, fontWeight:700, color }}>{val}</p>
                      <p style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expense breakdown */}
              <div className="card" style={{ padding:'1.5rem' }}>
                <p style={{ fontWeight:600, fontSize:14, marginBottom:'1rem' }}>Expense Breakdown</p>
                {Object.keys(cowStats.expense_breakdown).length === 0 ? (
                  <p style={{ color:'var(--text3)', fontSize:13 }}>No expenses recorded</p>
                ) : Object.entries(cowStats.expense_breakdown).map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                    <p style={{ fontSize:13, color:'var(--text2)', textTransform:'capitalize' }}>{k.replace('_',' ')}</p>
                    <p style={{ fontSize:13, fontWeight:600, color:'var(--red)' }}>₹{v}</p>
                  </div>
                ))}
              </div>

              {/* Daily milk sales */}
              <div className="card" style={{ padding:'1.5rem' }}>
                <p style={{ fontWeight:600, fontSize:14, marginBottom:'1rem' }}>Daily Milk Sales</p>
                {cowStats.daily_milk_sales.length === 0 ? (
                  <p style={{ color:'var(--text3)', fontSize:13 }}>No sales recorded</p>
                ) : (
                  <table>
                    <thead><tr><th>Date</th><th>Litres</th><th>Income</th><th>Buyer</th></tr></thead>
                    <tbody>
                      {cowStats.daily_milk_sales.slice(0,10).map((s,i) => (
                        <tr key={i}>
                          <td style={{ fontSize:11 }}>{s.date}</td>
                          <td>{s.litres?.toFixed(1)}L</td>
                          <td style={{ color:'var(--green)', fontWeight:500 }}>₹{s.income?.toFixed(0)}</td>
                          <td style={{ fontSize:12, color:'var(--text3)' }}>{s.buyer||'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Health events */}
              <div className="card" style={{ padding:'1.5rem' }}>
                <p style={{ fontWeight:600, fontSize:14, marginBottom:'1rem' }}>Health Events</p>
                {cowStats.health_events.length === 0 ? (
                  <p style={{ color:'var(--green)', fontSize:13 }}>No health alerts recorded ✓</p>
                ) : cowStats.health_events.slice(0,8).map((h,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                    <span style={{ fontSize:12, color:'var(--text3)' }}>{new Date(h.date).toLocaleDateString()}</span>
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                      background: h.risk_label==='high' ? 'var(--red-dim)' : 'var(--amber-dim)',
                      color: h.risk_label==='high' ? 'var(--red)' : 'var(--amber)' }}>
                      {h.risk_label} · {h.temperature}°C
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DAILY REPORT ── */}
      {tab === 'daily' && (
        <div className="animate-fade-up">
          {!dailyReport ? (
            <div className="card"><div className="empty-state"><p>Loading today's report…</p></div></div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:'1.25rem' }}>
              <div className="card" style={{ padding:'1.5rem' }}>
                <p style={{ fontWeight:600, fontSize:14, marginBottom:'1rem' }}>📅 {dailyReport.date} — Financial Summary</p>
                {[
                  { label:'Total Income',   val:`₹${dailyReport.financial.total_income}`,   color:'var(--green)' },
                  { label:'Total Expenses', val:`₹${dailyReport.financial.total_expenses}`, color:'var(--red)'   },
                  { label:'Net Profit',     val:`₹${dailyReport.financial.net_profit}`,     color: dailyReport.financial.profitable ? 'var(--green)' : 'var(--red)' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                    <p style={{ fontSize:13, color:'var(--text2)' }}>{label}</p>
                    <p style={{ fontSize:14, fontWeight:700, color }}>{val}</p>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding:'1.5rem' }}>
                <p style={{ fontWeight:600, fontSize:14, marginBottom:'1rem' }}>🥛 Milk Summary</p>
                <p style={{ fontSize:28, fontWeight:800, color:'var(--blue)', marginBottom:4 }}>{dailyReport.milk.total_litres}L</p>
                <p style={{ fontSize:12, color:'var(--text3)', marginBottom:'1rem' }}>Total collected today</p>
                {Object.entries(dailyReport.milk.buyers||{}).map(([buyer, data]) => (
                  <div key={buyer} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                    <p style={{ fontSize:13, color:'var(--text2)' }}>{buyer}</p>
                    <p style={{ fontSize:12, color:'var(--text3)' }}>{data.litres?.toFixed(1)}L · ₹{data.amount?.toFixed(0)}</p>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding:'1.5rem' }}>
                <p style={{ fontWeight:600, fontSize:14, marginBottom:'1rem' }}>🐄 Health Summary</p>
                <div style={{ display:'flex', gap:12, marginBottom:'1rem' }}>
                  <div style={{ textAlign:'center', flex:1 }}>
                    <p style={{ fontSize:28, fontWeight:800, color:'var(--red)' }}>{dailyReport.health.sick_today}</p>
                    <p style={{ fontSize:11, color:'var(--text3)' }}>Sick cattle today</p>
                  </div>
                  <div style={{ textAlign:'center', flex:1 }}>
                    <p style={{ fontSize:28, fontWeight:800, color:'var(--amber)' }}>{dailyReport.milk_quality.failed_batches}</p>
                    <p style={{ fontSize:11, color:'var(--text3)' }}>Failed milk batches</p>
                  </div>
                </div>
                {dailyReport.health.sick_animals?.map((a,i) => (
                  <div key={i} style={{ fontSize:12, padding:'6px 10px', borderRadius:6, background:'var(--red-dim)', marginBottom:6 }}>
                    Cow {a.cow} — {a.risk} risk · {a.temp}°C
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── P&L REPORT ── */}
      {tab === 'pl' && (
        <div className="animate-fade-up">
          {!plReport ? (
            <div className="card"><div className="empty-state"><p>Loading P&L report…</p></div></div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:'1.25rem' }}>
              <div className="card" style={{ padding:'1.5rem' }}>
                <p style={{ fontWeight:600, fontSize:14, marginBottom:'1rem' }}>📈 {plReport.period} — P&L Report</p>
                {[
                  { label:'Total Income',    val:`₹${plReport.income}`,    color:'var(--green)' },
                  { label:'Total Expenses',  val:`₹${plReport.expenses}`,  color:'var(--red)'   },
                  { label:'Net Profit/Loss', val:`₹${plReport.net_profit}`,color: plReport.profitable ? 'var(--green)' : 'var(--red)' },
                  { label:'Transactions',    val: plReport.transaction_count, color:'var(--blue)' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                    <p style={{ fontSize:13, color:'var(--text2)' }}>{label}</p>
                    <p style={{ fontSize:16, fontWeight:700, color }}>{val}</p>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding:'1.5rem' }}>
                <p style={{ fontWeight:600, fontSize:14, marginBottom:'1rem' }}>Breakdown by Category</p>
                {Object.entries(plReport.breakdown||{}).map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                    <p style={{ fontSize:13, color:'var(--text2)', textTransform:'capitalize' }}>{k.replace('_',' ')}</p>
                    <p style={{ fontSize:13, fontWeight:600, color: v>=0 ? 'var(--green)' : 'var(--red)' }}>
                      {v>=0?'+':''}₹{Math.abs(v).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FORECAST ── */}
      {tab === 'forecast' && (
        <div className="animate-fade-up">
          <div className="card">
            <p style={{ fontWeight:600, marginBottom:12 }}>🔮 Milk Price Forecast — Next 30 Days</p>
            {forecast.length === 0 ? (
              <div className="empty-state"><p>Loading forecast…</p></div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table>
                  <thead><tr><th>Date</th><th>Predicted Price</th><th>Lower</th><th>Upper</th><th>Trend</th></tr></thead>
                  <tbody>
                    {forecast.slice(0,14).map((f,i) => {
                      const prev = i>0 ? forecast[i-1].predicted : f.predicted
                      const trend = f.predicted > prev ? '↑' : f.predicted < prev ? '↓' : '→'
                      const tcolor = trend==='↑' ? 'var(--green)' : trend==='↓' ? 'var(--red)' : 'var(--text3)'
                      return (
                        <tr key={i}>
                          <td style={{ fontSize:12 }}>{f.date}</td>
                          <td style={{ fontWeight:700, color:'var(--green)' }}>₹{f.predicted}/L</td>
                          <td style={{ fontSize:12, color:'var(--text3)' }}>₹{f.lower}</td>
                          <td style={{ fontSize:12, color:'var(--text3)' }}>₹{f.upper}</td>
                          <td style={{ fontSize:16, color:tcolor }}>{trend}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <p style={{ fontSize:12, color:'var(--text3)', marginTop:12, fontFamily:'JetBrains Mono,monospace' }}>
                  Powered by Facebook Prophet · Add more milk sales for accurate forecast
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ADD ENTRY ── */}
      {tab === 'add' && (
        <div className="animate-fade-up" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:'1.5rem' }}>

          {/* Expense */}
          <div className="card" style={{ padding:'1.75rem' }}>
            <p className="section-tag">Manual Expense</p>
            <h3 className="font-display" style={{ fontSize:17, fontWeight:700, color:'var(--text)', marginBottom:'1.25rem' }}>
              Add Expense
            </h3>
            {msg && <p style={{ color: msg.startsWith('✅') ? 'var(--green)' : 'var(--red)', fontSize:13, marginBottom:10 }}>{msg}</p>}
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <label>Cattle ID (optional — leave blank for farm expense)</label>
                <input type="number" placeholder="e.g. 3" value={expForm.cattle_id} onChange={e => setExpForm({...expForm, cattle_id:e.target.value})} />
              </div>
              <div>
                <label>Category</label>
                <select value={expForm.record_type} onChange={e => setExpForm({...expForm, record_type:e.target.value})}>
                  {['feed','medicine','vaccination','labour','equipment','other'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label>Description</label>
                <input placeholder="e.g. Green fodder 10kg" value={expForm.description} onChange={e => setExpForm({...expForm, description:e.target.value})} />
              </div>
              <div>
                <label>Amount (₹)</label>
                <input type="number" placeholder="e.g. 350" value={expForm.amount} onChange={e => setExpForm({...expForm, amount:e.target.value})} />
              </div>
              <button className="btn-primary" style={{ justifyContent:'center' }} onClick={saveExpense} disabled={saving}>
                {saving ? 'Saving…' : 'Save Expense'}
              </button>
            </div>
          </div>

          {/* Sale */}
          <div className="card" style={{ padding:'1.75rem' }}>
            <p className="section-tag">Manual Sale Entry</p>
            <h3 className="font-display" style={{ fontSize:17, fontWeight:700, color:'var(--text)', marginBottom:'1.25rem' }}>
              Record Milk Sale
            </h3>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <label>Cattle ID (optional)</label>
                <input type="number" placeholder="e.g. 5" value={saleForm.cattle_id} onChange={e => setSaleForm({...saleForm, cattle_id:e.target.value})} />
              </div>
              <div>
                <label>Litres Sold</label>
                <input type="number" placeholder="e.g. 42" value={saleForm.litres} onChange={e => setSaleForm({...saleForm, litres:e.target.value})} />
              </div>
              <div>
                <label>Price per Litre (₹)</label>
                <input type="number" placeholder="e.g. 34" value={saleForm.price_per_litre} onChange={e => setSaleForm({...saleForm, price_per_litre:e.target.value})} />
              </div>
              <div>
                <label>Buyer Name</label>
                <input placeholder="e.g. KMF Mandya" value={saleForm.buyer_name} onChange={e => setSaleForm({...saleForm, buyer_name:e.target.value})} />
              </div>
              {saleForm.litres && saleForm.price_per_litre && (
                <div style={{ padding:'10px 14px', borderRadius:8, background:'var(--green-dim)', border:'1px solid rgba(34,201,122,0.3)' }}>
                  <p style={{ fontSize:14, fontWeight:700, color:'var(--green)' }}>
                    Total: ₹{(parseFloat(saleForm.litres||0)*parseFloat(saleForm.price_per_litre||0)).toFixed(2)}
                  </p>
                </div>
              )}
              <button className="btn-primary" style={{ justifyContent:'center' }} onClick={saveSale} disabled={saving}>
                {saving ? 'Saving…' : 'Record Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
