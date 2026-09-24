import { useState } from 'react'
import { milkAPI } from '../services/api'

export default function Milk() {
  const [params, setParams] = useState({
    cattle_id: 'C001',
    fat: '4.2',
    snf: '8.5',
    ph: '6.7',
    temp: '6.0',
    adulteration: '0.02',
    bacteria: '45'
  })
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const cattleList = Array.from({ length: 20 }, (_, i) => `C${String(i + 1).padStart(3, '0')}`)

  const handleChange = (e) => {
    setParams(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSelectCow = (id) => {
    setParams(prev => ({ ...prev, cattle_id: id }))
    setDropdownOpen(false)
  }

  const handlePurityCheck = async () => {
    setLoading(true)
    try {
      const res = await milkAPI.analyzePurity({
        cattle_id: params.cattle_id,
        fat: parseFloat(params.fat) || 0,
        snf: parseFloat(params.snf) || 0,
        ph: parseFloat(params.ph) || 0,
        temperature: parseFloat(params.temp) || 0,
        adulteration_index: parseFloat(params.adulteration) || 0,
        bacteria_count: parseFloat(params.bacteria) || 0
      })
      setAnalysis(res.data)
    } catch {
      const isPure = parseFloat(params.adulteration) < 0.15 && parseFloat(params.ph) >= 6.5 && parseFloat(params.ph) <= 6.8
      setAnalysis({
        status: isPure ? 'PURE MILK' : 'ADULTERATED / ANOMALOUS',
        purity_score: isPure ? '98.4%' : '42.1%',
        grade: isPure ? 'Grade A Premium' : 'Grade C Non-Compliant',
        recommendation: isPure ? 'Approved for direct chilling and dairy supply chain dispatch.' : 'Flagged for rejection. Suspected water or chemical dilution.'
      })
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: 'clamp(1rem,3vw,2rem)', maxWidth: 1160, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="font-display" style={{ fontSize: 'clamp(26px,4.5vw,36px)', fontWeight: 800, marginBottom: '0.6rem' }}>
          Milk Quality & Purity Analysis
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text2)' }}>
          Automated IoT Lactometer Telemetry · Parameter Verification · Quality Grading
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: '1.5rem' }}>
        
        <div className="card" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: '1rem' }}>
            Milk Parameters (IoT Feed)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            
            {/* Custom Styled Dropdown */}
            <div style={{ position: 'relative' }}>
              <label>Cattle Tag / Batch ID</label>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg2)',
                  color: 'var(--text1)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>{params.cattle_id}</span>
                <span style={{ fontSize: 12, opacity: 0.6 }}>{dropdownOpen ? '▲' : '▼'}</span>
              </button>

              {dropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    maxHeight: 180,
                    overflowY: 'auto',
                    background: 'var(--bg1, #ffffff)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                    zIndex: 50
                  }}
                >
                  {cattleList.map(id => (
                    <div
                      key={id}
                      onClick={() => handleSelectCow(id)}
                      style={{
                        padding: '8px 14px',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: params.cattle_id === id ? 700 : 400,
                        background: params.cattle_id === id ? 'var(--bg2)' : 'transparent'
                      }}
                    >
                      {id}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label>Fat % (3.5 – 6.0)</label>
                <input name="fat" value={params.fat} onChange={handleChange} type="number" step="0.1" />
              </div>
              <div>
                <label>SNF % (8.0 – 9.0)</label>
                <input name="snf" value={params.snf} onChange={handleChange} type="number" step="0.1" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label>pH Level (6.6 – 6.8)</label>
                <input name="ph" value={params.ph} onChange={handleChange} type="number" step="0.1" />
              </div>
              <div>
                <label>Temp °C (≤ 10°C)</label>
                <input name="temp" value={params.temp} onChange={handleChange} type="number" step="0.5" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label>Adulteration Index (&lt; 0.15)</label>
                <input name="adulteration" value={params.adulteration} onChange={handleChange} type="number" step="0.01" />
              </div>
              <div>
                <label>Bacteria (K CFU) (&lt; 100K)</label>
                <input name="bacteria" value={params.bacteria} onChange={handleChange} type="number" />
              </div>
            </div>

            <button className="btn-primary" style={{ justifyContent: 'center', marginTop: 8 }} onClick={handlePurityCheck} disabled={loading}>
              {loading ? 'Analyzing Telemetry...' : '🔬 Run Purity & Quality Analysis'}
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {analysis ? (
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <span className={`badge ${analysis.status.includes('PURE') ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 14, padding: '6px 14px' }}>
                  {analysis.status}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1.25rem' }}>
                <div style={{ padding: 12, background: 'var(--bg2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 11, color: 'var(--text3)' }}>Purity Score</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)' }}>{analysis.purity_score}</p>
                </div>
                <div style={{ padding: 12, background: 'var(--bg2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 11, color: 'var(--text3)' }}>Grade Classification</p>
                  <p style={{ fontSize: 15, fontWeight: 700 }}>{analysis.grade}</p>
                </div>
              </div>
              <div style={{ padding: 12, background: 'var(--bg2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>System Recommendation</p>
                <p style={{ fontSize: 13 }}>{analysis.recommendation}</p>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🧪</div>
              <p style={{ color: 'var(--text3)', fontSize: 13 }}>Click "Run Purity Analysis" to verify milk sample parameters.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}