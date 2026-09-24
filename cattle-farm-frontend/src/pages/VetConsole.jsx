/**
 * VetConsole.jsx — Module 2: Real Vet Dashboard
 * =============================================
 * This page is for the DOCTOR (not the farmer).
 * Open this on a second device during demo.
 * URL: /vet-console
 *
 * Features:
 *  - Vet sets themselves as Available/Busy
 *  - Receives incoming call notifications via Socket.IO
 *  - Sees full cow health context before accepting
 *  - Accepts call → Jitsi room opens
 *  - Writes prescription after call → auto-logs to finance
 */

import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

const BASE_URL = 'http://localhost:8000'

const styles = {
  page:    { padding: '2rem', maxWidth: 900, margin: '0 auto', fontFamily: 'inherit' },
  card:    { background: 'var(--bg2,#f9f9f6)', border: '1px solid var(--border,#e5e5e0)',
             borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1rem' },
  title:   { fontSize: 22, fontWeight: 600, margin: '0 0 4px' },
  label:   { fontSize: 11, fontWeight: 500, color: 'var(--text3,#888)', textTransform: 'uppercase',
             letterSpacing: '.05em', marginBottom: 4 },
  input:   { width: '100%', padding: '8px 12px', borderRadius: 8,
             border: '1px solid var(--border,#e5e5e0)', background: 'var(--bg1,#fff)',
             fontSize: 14, marginBottom: '0.75rem', boxSizing: 'border-box' },
  btn:     { padding: '10px 20px', borderRadius: 8, border: 'none',
             cursor: 'pointer', fontSize: 14, fontWeight: 500 },
  green:   { background: '#1D9E75', color: '#fff' },
  red:     { background: '#A32D2D', color: '#fff' },
  blue:    { background: '#378ADD', color: '#fff' },
  amber:   { background: '#BA7517', color: '#fff' },
  tag:     { display: 'inline-block', fontSize: 11, padding: '2px 8px', borderRadius: 99,
             marginRight: 4, marginBottom: 4 },
  high:    { background: '#FCEBEB', color: '#A32D2D', border: '1px solid #F5BCBC' },
  medium:  { background: '#FAEEDA', color: '#BA7517', border: '1px solid #F0D48A' },
  low:     { background: '#E1F5EE', color: '#085041', border: '1px solid #5DCAA5' },
}

export default function VetConsole() {
  const [vetName,      setVetName]      = useState('Dr. Ravi Kumar')
  const [available,    setAvailable]    = useState(false)
  const [connected,    setConnected]    = useState(false)
  const [incomingCall, setIncomingCall] = useState(null)
  const [prescription, setPrescription] = useState('')
  const [consultFee,   setConsultFee]   = useState('')
  const [medCost,      setMedCost]      = useState('')
  const [callActive,   setCallActive]   = useState(false)
  const [consultId,    setConsultId]    = useState(null)
  const [savedMsg,     setSavedMsg]     = useState('')
  const [log,          setLog]          = useState([])
  const socketRef = useRef(null)

  const addLog = (msg) =>
    setLog(prev => [...prev.slice(-19),
      `[${new Date().toLocaleTimeString()}] ${msg}`])

  // ── Connect to Socket.IO as VET ────────────────────────────────────────────
  const connectSocket = () => {
    if (socketRef.current?.connected) return
    socketRef.current = io(BASE_URL, {
      transports: ['polling', 'websocket'],
      path:       '/socket.io',
      auth:       { role: 'vet', name: vetName },
    })

    socketRef.current.on('connect', () => {
      setConnected(true)
      setAvailable(true)
      addLog(`Connected as ${vetName} — waiting for calls`)
    })

    socketRef.current.on('disconnect', () => {
      setConnected(false)
      setAvailable(false)
      addLog('Disconnected from server')
    })

    socketRef.current.on('incoming_call', (data) => {
      addLog(`📞 Incoming call! Cow #${data.cattle_id} — ${data.risk_label?.toUpperCase()} risk`)
      setIncomingCall(data)
    })

    socketRef.current.on('connect_error', (err) => {
      addLog(`Connection error: ${err.message}`)
    })

    socketRef.current.connect()
  }

  const disconnectSocket = () => {
    socketRef.current?.disconnect()
    setConnected(false)
    setAvailable(false)
    addLog('You are now offline')
  }

  // ── Accept call ────────────────────────────────────────────────────────────
  const acceptCall = async () => {
    if (!incomingCall) return
    const { room_id, cattle_id, farmer_name } = incomingCall

    // Notify farmer via Socket.IO
    socketRef.current.emit('call_accepted', {
      room_id, vet_name: vetName
    })

    // Create consultation record in backend
    try {
      const res = await fetch(`${BASE_URL}/api/vet/video-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cattle_id, farmer_name, vet_name: vetName }),
      })
      const data = await res.json()
      setConsultId(data.consultation_id)
    } catch(e) { console.log('Could not create consult record:', e) }

    // Open Jitsi room
    window.open(`https://meet.jit.si/${room_id}`, '_blank')
    setCallActive(true)
    addLog(`✓ Accepted call — Jitsi room opened: ${room_id}`)
  }

  const declineCall = () => {
    addLog(`✗ Declined call from farmer`)
    setIncomingCall(null)
  }

  // ── Save prescription ──────────────────────────────────────────────────────
  const savePrescription = async () => {
    if (!consultId || !prescription.trim()) return
    try {
      await fetch(`${BASE_URL}/api/vet/prescription/${consultId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultation_id:  consultId,
          vet_name:         vetName,
          prescription,
          consultation_fee: parseFloat(consultFee) || 0,
          med_cost:         parseFloat(medCost)    || 0,
        }),
      })
      setSavedMsg('✓ Prescription saved. Expense auto-logged to farm finance.')
      setCallActive(false)
      setIncomingCall(null)
      addLog('Prescription saved + finance updated')
    } catch(e) {
      setSavedMsg('Error saving prescription. Try again.')
    }
  }

  useEffect(() => () => socketRef.current?.disconnect(), [])

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.card}>
        <p style={styles.title}>🩺 GauRaksha — Vet Console</p>
        <p style={{ fontSize: 13, color: 'var(--text3,#888)', margin: 0 }}>
          Veterinary dashboard — real-time call acceptance via Socket.IO + Jitsi Meet
        </p>
      </div>

      {/* Vet identity + connect */}
      <div style={styles.card}>
        <div style={styles.label}>Your name</div>
        <input
          style={styles.input}
          value={vetName}
          onChange={e => setVetName(e.target.value)}
          disabled={connected}
        />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {!connected
            ? <button style={{...styles.btn,...styles.green}} onClick={connectSocket}>
                Go Online
              </button>
            : <button style={{...styles.btn,...styles.red}} onClick={disconnectSocket}>
                Go Offline
              </button>
          }
          <span style={{
            ...styles.tag,
            ...(connected ? styles.low : styles.high),
            fontSize: 13, padding: '4px 12px'
          }}>
            {connected ? '🟢 Online — ready for calls' : '🔴 Offline'}
          </span>
        </div>
      </div>

      {/* Incoming call alert */}
      {incomingCall && (
        <div style={{
          ...styles.card,
          border: '2px solid #A32D2D',
          background: '#FCEBEB',
          animation: 'pulse 1s infinite'
        }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#A32D2D', margin: '0 0 8px' }}>
            📞 INCOMING CALL
          </p>
          <p style={{ margin: '0 0 4px', fontSize: 14 }}>
            <b>Farmer:</b> {incomingCall.farmer_name}
          </p>
          <p style={{ margin: '0 0 4px', fontSize: 14 }}>
            <b>Cow ID:</b> #{incomingCall.cattle_id} &nbsp;
            <span style={{...styles.tag,...styles.high}}>
              {incomingCall.risk_label?.toUpperCase()} RISK
            </span>
          </p>

          {/* Auto cow context */}
          {incomingCall.cow_context && (
            <pre style={{
              background: '#fff', border: '1px solid #F5BCBC', borderRadius: 8,
              padding: '0.75rem', fontSize: 12, whiteSpace: 'pre-wrap',
              margin: '0.75rem 0', color: '#333',
            }}>
              {incomingCall.cow_context}
            </pre>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button style={{...styles.btn,...styles.green}} onClick={acceptCall}>
              ✓ Accept & Start Video Call
            </button>
            <button style={{...styles.btn,...styles.red}} onClick={declineCall}>
              ✗ Decline
            </button>
          </div>
        </div>
      )}

      {/* Prescription form — after call */}
      {callActive && (
        <div style={styles.card}>
          <p style={{ fontWeight: 600, margin: '0 0 12px' }}>
            📋 Post-consultation — Write Prescription
          </p>
          <div style={styles.label}>Diagnosis & Prescription</div>
          <textarea
            style={{ ...styles.input, height: 100, resize: 'vertical' }}
            placeholder="Diagnosis: Mastitis in early stage. Treatment: Isolate animal. Apply...  Follow-up: After 3 days."
            value={prescription}
            onChange={e => setPrescription(e.target.value)}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={styles.label}>Consultation Fee (₹)</div>
              <input style={styles.input} type="number" placeholder="500"
                value={consultFee} onChange={e => setConsultFee(e.target.value)} />
            </div>
            <div>
              <div style={styles.label}>Medicine Cost (₹)</div>
              <input style={styles.input} type="number" placeholder="250"
                value={medCost} onChange={e => setMedCost(e.target.value)} />
            </div>
          </div>
          {savedMsg && (
            <p style={{ color: '#1D9E75', fontWeight: 500, fontSize: 13 }}>{savedMsg}</p>
          )}
          <button style={{...styles.btn,...styles.blue}} onClick={savePrescription}>
            Save Prescription + Log Expense
          </button>
        </div>
      )}

      {/* Activity log */}
      <div style={styles.card}>
        <p style={{ fontWeight: 600, margin: '0 0 8px', fontSize: 14 }}>Activity Log</p>
        {log.length === 0
          ? <p style={{ color: 'var(--text3,#888)', fontSize: 13 }}>No activity yet. Click "Go Online" to start.</p>
          : <div style={{
              background: 'var(--bg1,#fff)', borderRadius: 8, padding: '0.75rem',
              maxHeight: 200, overflowY: 'auto',
            }}>
              {log.map((l,i) => (
                <div key={i} style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>{l}</div>
              ))}
            </div>
        }
      </div>

      {/* Instructions for demo */}
      <div style={{ ...styles.card, background: '#E1F5EE', border: '1px solid #5DCAA5' }}>
        <p style={{ fontWeight: 600, color: '#085041', margin: '0 0 6px' }}>
          📖 How to use during external review
        </p>
        <ol style={{ fontSize: 13, color: '#085041', margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
          <li>Open this page on a <b>second device</b> (phone or another laptop)</li>
          <li>Enter your name and click <b>"Go Online"</b></li>
          <li>On the main demo laptop, go to Health page → find a HIGH risk cow → click "Video Call"</li>
          <li>This page will immediately show an <b>INCOMING CALL alert</b> with full cow health details</li>
          <li>Click <b>"Accept &amp; Start Video Call"</b> → Jitsi opens on both devices</li>
          <li>Panel sees a <b>real two-way video call</b> between farmer and vet</li>
          <li>After call, write prescription here → click Save → expense auto-appears in Finance module</li>
        </ol>
      </div>

    </div>
  )
}
