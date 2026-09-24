import { useState } from 'react'
import { healthAPI } from '../services/api'

const INITIAL_20_CATTLE = [
  { tag_id: 'C001', name: 'Lakshmi', breed: 'HF Cross', age: '4.5y', weight: '420 kg', node: 'node_1', status: 'Healthy', score: '0%', risk: 'Healthy' },
  { tag_id: 'C002', name: 'Ganga', breed: 'Jersey', age: '3y', weight: '380 kg', node: 'node_1', status: 'Healthy', score: '5%', risk: 'Healthy' },
  { tag_id: 'C003', name: 'Saraswati', breed: 'Sahiwal', age: '5y', weight: '400 kg', node: 'node_2', status: 'Medium Risk', score: '48%', risk: 'Medium Risk' },
  { tag_id: 'C004', name: 'Kaveri', breed: 'Gir', age: '2.5y', weight: '350 kg', node: 'node_2', status: 'Healthy', score: '10%', risk: 'Healthy' },
  { tag_id: 'C005', name: 'Sonni', breed: 'HF Cross', age: '4y', weight: '340 kg', node: 'node_1', status: 'Alert sent to owner', score: '92%', risk: 'Critical' },
  { tag_id: 'C006', name: 'Kamadhenu', breed: 'Red Sindhi', age: '3.5y', weight: '390 kg', node: 'node_3', status: 'Healthy', score: '12%', risk: 'Healthy' },
  { tag_id: 'C007', name: 'Gauri', breed: 'Amrit Mahal', age: '6y', weight: '410 kg', node: 'node_2', status: 'Medium Risk', score: '58%', risk: 'Medium Risk' },
  { tag_id: 'C008', name: 'Abhi', breed: 'HF Cross', age: '4y', weight: '350 kg', node: 'node_1', status: 'Healthy', score: '2%', risk: 'Healthy' },
  { tag_id: 'C009', name: 'Tulsi', breed: 'Jersey', age: '2y', weight: '310 kg', node: 'node_3', status: 'Healthy', score: '8%', risk: 'Healthy' },
  { tag_id: 'C010', name: 'Nandi', breed: 'Kankrej', age: '5.5y', weight: '460 kg', node: 'node_1', status: 'Healthy', score: '15%', risk: 'Healthy' },
  { tag_id: 'C011', name: 'Bhavani', breed: 'Sahiwal', age: '4.2y', weight: '395 kg', node: 'node_2', status: 'Healthy', score: '0%', risk: 'Healthy' },
  { tag_id: 'C012', name: 'Radha', breed: 'Gir', age: '3.8y', weight: '370 kg', node: 'node_3', status: 'Alert sent to owner', score: '88%', risk: 'Critical' },
  { tag_id: 'C013', name: 'Yamuna', breed: 'HF Cross', age: '5y', weight: '430 kg', node: 'node_1', status: 'Healthy', score: '4%', risk: 'Healthy' },
  { tag_id: 'C014', name: 'Durga', breed: 'Jersey', age: '2.8y', weight: '340 kg', node: 'node_2', status: 'Medium Risk', score: '52%', risk: 'Medium Risk' },
  { tag_id: 'C015', name: 'Uma', breed: 'Sahiwal', age: '6.1y', weight: '415 kg', node: 'node_3', status: 'Healthy', score: '11%', risk: 'Healthy' },
  { tag_id: 'C016', name: 'Champa', breed: 'Gir', age: '3.1y', weight: '360 kg', node: 'node_1', status: 'Healthy', score: '6%', risk: 'Healthy' },
  { tag_id: 'C017', name: 'Anandi', breed: 'HF Cross', age: '4.7y', weight: '425 kg', node: 'node_2', status: 'Healthy', score: '0%', risk: 'Healthy' },
  { tag_id: 'C018', name: 'Kalyani', breed: 'Red Sindhi', age: '5.2y', weight: '405 kg', node: 'node_3', status: 'Healthy', score: '14%', risk: 'Healthy' },
  { tag_id: 'C019', name: 'Mohini', breed: 'Jersey', age: '3.4y', weight: '355 kg', node: 'node_1', status: 'Medium Risk', score: '44%', risk: 'Medium Risk' },
  { tag_id: 'C020', name: 'Surabhi', breed: 'Amrit Mahal', age: '4.0y', weight: '385 kg', node: 'node_2', status: 'Healthy', score: '3%', risk: 'Healthy' },
]

export default function Health() {
  const [tab, setTab] = useState('all')
  const [cattle, setCattle] = useState(INITIAL_20_CATTLE)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCow, setSelectedCow] = useState(null)
  const [simulating, setSimulating] = useState(false)
  const [historyLogs, setHistoryLogs] = useState([])

  const alertsCount = cattle.filter(c => c.risk === 'Critical' || c.risk === 'Medium Risk').length

  const handleSimulateIoT = async () => {
    setSimulating(true)
    try {
      const res = await healthAPI.simulateIoT()
      if (res.data && Array.isArray(res.data.feed)) {
        setCattle(prev => prev.map(c => {
          const match = res.data.feed.find(f => f.tag_id === c.tag_id || f.cattle_id === c.tag_id)
          if (match) {
            return {
              ...c,
              score: match.score || c.score,
              risk: match.risk_level || c.risk,
              status: match.risk_level === 'Critical' ? 'Alert sent to owner' : match.risk_level === 'Medium Risk' ? 'Medium Risk' : 'Healthy'
            }
          }
          return c
        }))
      }
    } catch {
      setCattle(prev => prev.map(c => {
        if (c.tag_id === 'C005' || c.tag_id === 'C012') {
          return { ...c, risk: 'Critical', score: '94%', status: 'Alert sent to owner' }
        }
        if (c.tag_id === 'C003' || c.tag_id === 'C007' || c.tag_id === 'C014') {
          return { ...c, risk: 'Medium Risk', score: '55%', status: 'Medium Risk' }
        }
        return c
      }))
    }
    setSimulating(false)
  }

  const handleViewHistory = (cow) => {
    setSelectedCow(cow)
    setHistoryLogs([
      { timestamp: 'Today, 10:00 AM', temp: cow.risk === 'Critical' ? '40.2°C' : cow.risk === 'Medium Risk' ? '39.2°C' : '38.5°C', heart_rate: cow.risk === 'Critical' ? '92 bpm' : '68 bpm', steps: '1,420', rumination: '450 min/day', status: cow.risk },
      { timestamp: 'Yesterday, 06:00 PM', temp: '38.5°C', heart_rate: '65 bpm', steps: '2,100', rumination: '480 min/day', status: 'Healthy' },
      { timestamp: 'Yesterday, 08:00 AM', temp: '38.4°C', heart_rate: '64 bpm', steps: '1,950', rumination: '460 min/day', status: 'Healthy' },
    ])
  }

  const filteredCattle = cattle.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.tag_id.toLowerCase().includes(searchTerm.toLowerCase())
    if (tab === 'alerts') return matchesSearch && (c.risk === 'Critical' || c.risk === 'Medium Risk')
    return matchesSearch
  })

  return (
    <div style={{ padding: 'clamp(1rem,3vw,2rem)', maxWidth: 1160, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="font-display" style={{ fontSize: 'clamp(26px,4.5vw,36px)', fontWeight: 800, marginBottom: '0.6rem' }}>
          Health Monitor
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text2)' }}>
          IoT Telemetry · Federated Anomaly Classification · Real-time Risk Feed
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button onClick={() => { setTab('all'); setSelectedCow(null) }} className={`module-tab${tab === 'all' && !selectedCow ? ' active' : ''}`}>
          🐄 All Cattle ({cattle.length})
        </button>
        <button onClick={() => { setTab('alerts'); setSelectedCow(null) }} className={`module-tab${tab === 'alerts' && !selectedCow ? ' active' : ''}`}>
          🚨 Alerts ({alertsCount})
        </button>
      </div>

      {selectedCow ? (
        <div className="card" style={{ padding: '1.5rem' }}>
          <button className="btn-ghost" style={{ marginBottom: '1rem' }} onClick={() => setSelectedCow(null)}>
            ← Back to all cattle
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>
              Telemetry History — {selectedCow.name} ({selectedCow.tag_id})
            </h3>
            <span className={`badge ${selectedCow.risk === 'Critical' ? 'badge-red' : selectedCow.risk === 'Medium Risk' ? 'badge-amber' : 'badge-green'}`}>
              {selectedCow.risk} ({selectedCow.score})
            </span>
          </div>

          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Body Temp</th>
                <th>Heart Rate</th>
                <th>Steps</th>
                <th>Rumination</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {historyLogs.map((log, idx) => (
                <tr key={idx}>
                  <td>{log.timestamp}</td>
                  <td>{log.temp}</td>
                  <td>{log.heart_rate}</td>
                  <td>{log.steps}</td>
                  <td>{log.rumination}</td>
                  <td>
                    <span className={`badge ${log.status === 'Critical' ? 'badge-red' : log.status === 'Medium Risk' ? 'badge-amber' : 'badge-green'}`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === 'alerts' && filteredCattle.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <p style={{ fontWeight: 600 }}>No alerts — all cattle healthy</p>
        </div>
      ) : (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              placeholder="Search tag or name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ maxWidth: 280 }}
            />
            <button className="btn-primary" onClick={handleSimulateIoT} disabled={simulating}>
              {simulating ? 'Processing Sensor Feed...' : '⚡ Simulate IoT Sensor Feed'}
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>TAG</th>
                  <th>NAME</th>
                  <th>BREED</th>
                  <th>AGE</th>
                  <th>WEIGHT</th>
                  <th>FARM NODE</th>
                  <th>RISK SCORE</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredCattle.map(c => (
                  <tr key={c.tag_id}>
                    <td style={{ fontWeight: 700, color: 'var(--green)' }}>{c.tag_id}</td>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.breed}</td>
                    <td>{c.age}</td>
                    <td>{c.weight}</td>
                    <td><span className="badge badge-blue">{c.node}</span></td>
                    <td style={{ fontWeight: 700 }}>{c.score}</td>
                    <td>
                      <span className={`badge ${c.risk === 'Critical' ? 'badge-red' : c.risk === 'Medium Risk' ? 'badge-amber' : 'badge-green'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => handleViewHistory(c)}>
                        View history
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}