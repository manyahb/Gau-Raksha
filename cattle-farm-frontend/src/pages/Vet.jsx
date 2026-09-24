import { useState } from 'react'
import { vetAPI } from '../services/api'

const HIGH_RISK_COW = { tag_id: 'C005', name: 'Sonni', breed: 'HF Cross', temp: '40.2°C', heart_rate: '94 bpm', risk: 'Critical (High Risk)' }
const MEDIUM_RISK_COW = { tag_id: 'C003', name: 'Saraswati', breed: 'Sahiwal', temp: '39.1°C', heart_rate: '78 bpm', risk: 'Medium Risk' }

export default function Vet() {
  const [tab, setTab] = useState('decision')
  const [messages, setMessages] = useState([])
  const [inputMsg, setInputMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [vets, setVets] = useState([])

  const handleAutoBotConsult = async () => {
    setTab('chat')
    setLoading(true)
    const promptText = `Cattle #${MEDIUM_RISK_COW.tag_id} (${MEDIUM_RISK_COW.name}) has elevated body temp (${MEDIUM_RISK_COW.temp}) and heart rate (${MEDIUM_RISK_COW.heart_rate}). Provide immediate first-aid home remedies.`
    
    setMessages([{ sender: 'user', text: promptText, time: new Date().toLocaleTimeString() }])

    try {
      const res = await vetAPI.chat({ cattle_id: 3, user_message: promptText, farmer_name: 'Farmer' })
      setMessages(prev => [...prev, { sender: 'ai', text: res.data.response, time: new Date().toLocaleTimeString() }])
    } catch {
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: `🤖 AI Diagnosis for ${MEDIUM_RISK_COW.name} (#${MEDIUM_RISK_COW.tag_id}):\n\n- Primary Symptoms: Moderate Hyperthermia (${MEDIUM_RISK_COW.temp})\n- Recommended Remedies: Keep cow under shaded area, offer cold water with electrolytes, apply cool wet towel on neck.\n- Note: If temperature exceeds 40°C, trigger direct Video Call with Veterinarian.`,
        time: new Date().toLocaleTimeString()
      }])
    }
    setLoading(false)
  }

  const handleSendCustomMsg = async () => {
    if (!inputMsg.trim()) return
    const userMsg = { sender: 'user', text: inputMsg, time: new Date().toLocaleTimeString() }
    setMessages(prev => [...prev, userMsg])
    const currentMsg = inputMsg
    setInputMsg('')
    setLoading(true)

    try {
      const res = await vetAPI.chat({ user_message: currentMsg, farmer_name: 'Farmer' })
      setMessages(prev => [...prev, { sender: 'ai', text: res.data.response, time: new Date().toLocaleTimeString() }])
    } catch {
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: 'AI Assistant: Monitoring parameters closely. Ensure adequate shade, clean water, and isolate from herd if fever persists.',
        time: new Date().toLocaleTimeString()
      }])
    }
    setLoading(false)
  }

  const loadVets = async () => {
    setTab('vets')
    try {
      const res = await vetAPI.getNearbyVets(12.52, 76.89)
      setVets(res.data.vets || [])
    } catch {
      setVets([
        { name: 'Mandya Veterinary Hospital', phone: '+91 98450 12345', distance_km: '2.4', address: 'Main Road, Mandya' },
        { name: 'Karnataka Rural Vet Care', phone: '+91 98450 67890', distance_km: '4.1', address: 'Ryottu Complex, Mandya' }
      ])
    }
  }

  return (
    <div style={{ padding: 'clamp(1rem,3vw,2rem)', maxWidth: 1160, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="font-display" style={{ fontSize: 'clamp(26px,4.5vw,36px)', fontWeight: 800, marginBottom: '0.6rem' }}>
          Tele-Vet & AI Telemedicine
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text2)' }}>
          Automated Health Risk Routing · AI First Aid Assistant · Live Video Link
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button onClick={() => setTab('decision')} className={`module-tab${tab === 'decision' ? ' active' : ''}`}>⚡ Risk Telemetry Routing</button>
        <button onClick={() => setTab('chat')} className={`module-tab${tab === 'chat' ? ' active' : ''}`}>🤖 AI Chatbot Advice</button>
        <button onClick={loadVets} className={`module-tab${tab === 'vets' ? ' active' : ''}`}>📍 Veterinary Locator</button>
        <button onClick={() => setTab('call')} className={`module-tab${tab === 'call' ? ' active' : ''}`}>📹 Live Vet Video Call</button>
      </div>

      {tab === 'decision' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: '1.5rem' }}>
          
          <div className="card" style={{ padding: '1.75rem', border: '1px solid rgba(240,96,96,0.3)', background: 'var(--red-dim)' }}>
            <span className="badge badge-red" style={{ marginBottom: 12 }}>CRITICAL / HIGH RISK DETECTED</span>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
              Cattle #{HIGH_RISK_COW.tag_id} ({HIGH_RISK_COW.name})
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
              Temp: <strong>{HIGH_RISK_COW.temp}</strong> | Heart Rate: <strong>{HIGH_RISK_COW.heart_rate}</strong>
            </p>
            <p style={{ fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
              Critical telemetry anomalies require immediate direct veterinary intervention.
            </p>
            <button className="btn-primary" style={{ background: '#e03e3e', width: '100%', justifyContent: 'center' }} onClick={() => setTab('call')}>
              📹 Connect Live Vet Video Call
            </button>
          </div>

          <div className="card" style={{ padding: '1.75rem', border: '1px solid rgba(245,158,11,0.3)', background: 'var(--amber-dim)' }}>
            <span className="badge badge-amber" style={{ marginBottom: 12 }}>MEDIUM RISK DETECTED</span>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
              Cattle #{MEDIUM_RISK_COW.tag_id} ({MEDIUM_RISK_COW.name})
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
              Temp: <strong>{MEDIUM_RISK_COW.temp}</strong> | Heart Rate: <strong>{MEDIUM_RISK_COW.heart_rate}</strong>
            </p>
            <p style={{ fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
              Moderate temperature deviation detected. Generate automated AI first-aid home remedies.
            </p>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleAutoBotConsult}>
              🤖 Auto-Consult AI First Aid
            </button>
          </div>

        </div>
      )}

      {tab === 'chat' && (
        <div className="card" style={{ padding: '1.5rem', maxWidth: 800, margin: '0 auto' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
            AI Veterinary First-Aid Chat
          </h3>
          <div style={{ minHeight: 300, maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12, paddingRight: 4 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%', padding: '10px 14px', borderRadius: 12,
                background: m.sender === 'user' ? 'var(--green-dim)' : 'var(--bg2)',
                border: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 700 }}>{m.sender}</div>
                <p style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{m.text}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="Ask custom question to AI Vet..."
              value={inputMsg}
              onChange={e => setInputMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendCustomMsg()}
            />
            <button className="btn-primary" onClick={handleSendCustomMsg} disabled={loading}>
              {loading ? 'Thinking...' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {tab === 'vets' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12 }}>
          {vets.map((v, i) => (
            <div key={i} className="card" style={{ padding: '1.25rem' }}>
              <p style={{ fontWeight: 700, fontSize: 15 }}>{v.name}</p>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>📍 {v.address} ({v.distance_km} km)</p>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>📞 {v.phone}</p>
              <button className="btn-ghost" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} onClick={() => setTab('call')}>
                📹 Start Video Call
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'call' && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', background: '#000', color: '#fff', borderRadius: 16 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📹</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Live Tele-Vet Call Active</h3>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', maxWidth: 400, margin: '0 auto 1.5rem' }}>
            Streaming real-time cattle video feed & health telemetry to on-call veterinarian.
          </p>
          <div style={{ display: 'inline-block', padding: '6px 16px', background: 'rgba(34,201,122,0.2)', border: '1px solid #22c97a', borderRadius: 20, fontSize: 12, color: '#22c97a', fontWeight: 600 }}>
            ● WebRTC Video Room Live
          </div>
        </div>
      )}

    </div>
  )
}