import { useState, useEffect } from 'react'
import { healthAPI, milkAPI, financeAPI } from '../services/api'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const mockTrend = Array.from({ length: 7 }, (_, i) => ({
  day: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i],
  milk: Math.round(60 + Math.random() * 40),
}))

const MODULES = [
  {
    emoji: '🌐', tag: 'Module 01', label: 'Health Monitor',
    sub: 'Random Forest · Federated Learning',
    tech: ['RF Model', 'Flower FL', '2 Nodes'],
    color: '#22c97a', path: '/health',
  },
  {
    emoji: '🩺', tag: 'Module 02', label: 'AI Vet & Chat',
    sub: 'Gemma AI · Socket.IO · Jitsi',
    tech: ['Gemma LLM', 'WebSocket', 'Video'],
    color: '#60a8f0', path: '/vet',
  },
  {
    emoji: '🥛', tag: 'Module 03', label: 'Milk Purity',
    sub: '6-param classifier · PDF certificate',
    tech: ['6 Params', 'ML Classify', 'PDF cert'],
    color: '#a070f0', path: '/milk',
  },
  {
    emoji: '💹', tag: 'Module 04', label: 'Finance',
    sub: 'Prophet forecast · P&L · Rankings',
    tech: ['Prophet', 'P&L', 'Rankings'],
    color: '#f0a030', path: '/finance',
  },
]

export default function Dashboard() {
  const [health,  setHealth]  = useState(null)
  const [milk,    setMilk]    = useState(null)
  const [finance, setFinance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hoverModule, setHoverModule] = useState(null)

  useEffect(() => {
    Promise.allSettled([
      healthAPI.getDashboard(),
      milkAPI.getStats(),
      financeAPI.getDashboard(),
    ]).then(([h, m, f]) => {
      if (h.status === 'fulfilled') setHealth(h.value.data)
      if (m.status === 'fulfilled') setMilk(m.value.data)
      if (f.status === 'fulfilled') setFinance(f.value.data)
      setLoading(false)
    })
  }, [])

  const stats = [
    { emoji:'🐄', label:'Total Cattle',    value: loading ? '…' : (health?.total_cattle  ?? 0),           sub:'Active animals',  color:'var(--green)' },
    { emoji:'⚠️', label:'High Risk Alerts', value: loading ? '…' : (health?.high_risk     ?? 0),           sub:'Need attention',  color:'var(--red)'   },
    { emoji:'🥛', label:'Milk Pass Rate',   value: loading ? '…' : `${milk?.pass_rate     ?? 0}%`,         sub:'Quality index',   color:'var(--purple)' },
    { emoji:'💰', label:'Month Income',     value: loading ? '…' : `₹${finance?.this_month?.income ?? 0}`, sub:'Gross earnings',  color:'var(--amber)' },
  ]

  return (
    <div style={{ padding: 'clamp(1rem,3vw,2rem)', maxWidth: 1140, margin: '0 auto' }}>

      {/* ── Page Header ── */}
      <div style={{ marginBottom: '2rem' }} className="animate-fade-up">
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '5px 16px', borderRadius: 24,
          background: 'rgba(34,201,122,0.10)',
          border: '1px solid rgba(34,201,122,0.26)',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10.5, letterSpacing: '0.13em', color: 'var(--green)',
          textTransform: 'uppercase', marginBottom: '1rem',
        }}>
          <span className="live-dot" />
          Farm Overview · Live
        </div>

        <h1 className="font-display" style={{
          fontSize: 'clamp(26px,4.5vw,38px)',
          fontWeight: 800, color: 'var(--text)',
          letterSpacing: '-0.027em', lineHeight: 1.08,
          marginBottom: '0.6rem',
        }}>
          Farm Dashboard
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text2)', letterSpacing: '0.02em' }}>
          All 4 modules — monitoring your farm in real time
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
        gap: 12, marginBottom: '1.75rem',
      }} className="animate-fade-up">
        {stats.map(({ emoji, label, value, sub, color }) => (
          <div key={label} className="card stat-card" style={{ padding: '1.4rem', '--accent-color': color }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 10,
                background: `color-mix(in srgb, ${color} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${color} 24%, transparent)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              }}>
                {emoji}
              </div>
            </div>
            <p style={{
              fontSize: 28, fontWeight: 800, color,
              fontFamily: 'Syne, sans-serif', lineHeight: 1.1, marginBottom: 4,
            }}>
              {value}
            </p>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{label}</p>
            <p style={{ fontSize: 11, color: 'var(--text3)' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Middle Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14, marginBottom: '1.75rem' }}>

        {/* Risk Breakdown */}
        <div className="card animate-fade-up" style={{ padding: '1.5rem' }}>
          <p className="section-tag">Health Status</p>
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: '1.25rem' }}>
            Risk Breakdown
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label:'Low risk — Healthy',    value: health?.low_risk    ?? 0, color:'#22c97a', bg:'rgba(34,201,122,0.08)',   border:'rgba(34,201,122,0.18)' },
              { label:'Medium — Monitor',      value: health?.medium_risk ?? 0, color:'#f0a030', bg:'rgba(240,160,48,0.08)',   border:'rgba(240,160,48,0.18)' },
              { label:'High — Critical',       value: health?.high_risk   ?? 0, color:'#f06060', bg:'rgba(240,96,96,0.08)',    border:'rgba(240,96,96,0.18)'  },
            ].map(({ label, value, color, bg, border }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '11px 14px', borderRadius: 10,
                background: bg, border: `1px solid ${border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color }}>{label}</span>
                </div>
                <span style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'Syne,sans-serif' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="card animate-fade-up" style={{ padding: '1.5rem' }}>
          <p className="section-tag">7-Day Output</p>
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: '1.25rem' }}>
            Milk Production (litres)
          </h3>
          <ResponsiveContainer width="100%" height={165}>
            <AreaChart data={mockTrend} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="milkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c97a" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#22c97a" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill:'var(--text3)', fontSize:11, fontFamily:'JetBrains Mono,monospace' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'var(--text3)', fontSize:10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background:'rgba(15,26,18,0.96)', border:'1px solid rgba(34,201,122,0.2)', borderRadius:10, fontSize:12 }}
                labelStyle={{ color:'var(--text3)', fontFamily:'JetBrains Mono,monospace' }}
                itemStyle={{ color:'#22c97a' }}
              />
              <Area type="monotone" dataKey="milk" stroke="#22c97a" strokeWidth={2.5} fill="url(#milkGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Module Cards (LP style) ── */}
      <div style={{ marginBottom: '1rem' }}>
        <p style={{
          fontFamily: 'JetBrains Mono,monospace', fontSize: 10.5,
          color: 'var(--green)', letterSpacing: '0.13em',
          textTransform: 'uppercase', marginBottom: '0.6rem',
        }}>Platform Modules</p>
        <h2 className="font-display" style={{
          fontSize: 'clamp(18px,3vw,24px)', fontWeight: 800,
          color: 'var(--text)', letterSpacing: '-0.022em',
          marginBottom: '1.25rem',
        }}>
          All systems online
        </h2>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))',
        gap: 1,
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 16, overflow: 'hidden',
        border: '1px solid var(--border)',
      }} className="animate-fade-up">
        {MODULES.map((m, i) => (
          <div
            key={i}
            style={{
              background: hoverModule === i ? 'rgba(34,201,122,0.06)' : 'var(--card)',
              padding: '1.75rem 1.5rem',
              cursor: 'pointer',
              transition: 'background 0.2s',
              borderRight: i < MODULES.length-1 ? '1px solid var(--border)' : 'none',
            }}
            onMouseEnter={() => setHoverModule(i)}
            onMouseLeave={() => setHoverModule(null)}
          >
            {/* Icon */}
            <div style={{
              width: 46, height: 46, borderRadius: 12,
              background: `color-mix(in srgb, ${m.color} 12%, transparent)`,
              border: `1px solid color-mix(in srgb, ${m.color} 22%, transparent)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, marginBottom: '1rem',
            }}>
              {m.emoji}
            </div>

            {/* Tag */}
            <p style={{
              fontFamily: 'JetBrains Mono,monospace',
              fontSize: 10, color: m.color,
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6,
            }}>{m.tag}</p>

            <p className="font-display" style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text)', marginBottom: 5 }}>{m.label}</p>
            <p style={{ fontSize: 12.5, color: 'var(--text3)', lineHeight: 1.55, marginBottom: '1rem' }}>{m.sub}</p>

            {/* Tech tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: '1rem' }}>
              {m.tech.map(t => (
                <span key={t} style={{
                  padding: '3px 9px', borderRadius: 20,
                  fontSize: 10.5, fontFamily: 'JetBrains Mono,monospace',
                  background: `color-mix(in srgb, ${m.color} 8%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${m.color} 18%, transparent)`,
                  color: m.color,
                }}>{t}</span>
              ))}
            </div>

            <div style={{
              fontSize: 12, color: '#22c97a',
              fontFamily: 'JetBrains Mono,monospace',
              opacity: hoverModule === i ? 1 : 0,
              transition: 'opacity 0.2s',
            }}>
              Open module →
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}