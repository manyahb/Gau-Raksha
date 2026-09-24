import axios from 'axios'

export const BASE_URL = 'http://localhost:8000'

const api = axios.create({ baseURL: BASE_URL, timeout: 30000 })

// ── Module 1 — Health ─────────────────────────────────────────────────────────
export const healthAPI = {
  getCattle:    ()         => api.get('/api/health/cattle'),
  createCattle: (data)     => api.post('/api/health/cattle', data),
  getAlerts:    ()         => api.get('/api/health/alerts'),
  getRecords:   (id, n=20) => api.get(`/api/health/records/${id}?limit=${n}`),
  getDashboard: ()         => api.get('/api/health/dashboard-stats'),
  simulateFeed: ()         => api.get('/api/health/simulate-feed'),
  predict:      (data)     => api.post('/api/health/predict', data),
  getModelInfo: ()         => api.get('/api/health/model-info'),
}

// ── Module 2 — Vet ───────────────────────────────────────────────────────────
export const vetAPI = {
  chat:          (data)           => api.post('/api/vet/chat', data),
  getNearbyVets: (lat=12.52, lng=76.89) => api.get(`/api/vet/map?lat=${lat}&lng=${lng}`),
  videoCall:     (data)           => api.post('/api/vet/video-call', data),
  savePrescription: (id, data)    => api.post(`/api/vet/prescription/${id}`, data),
  getConsultations: (params={})   => api.get('/api/vet/consultations', { params }),
  getConsultation:  (id)          => api.get(`/api/vet/consultations/${id}`),
  getVetConsoleInfo:(roomId)      => api.get(`/api/vet/vet-console-info/${roomId}`),
}

// ── Module 3 — Milk ──────────────────────────────────────────────────────────
export const milkAPI = {
  simulateReading: (quality='pass') => api.get(`/api/milk/simulate-reading?quality=${quality}`),
  testMilk:        (data)           => api.post('/api/milk/test', data),
  getBuyers:       (verdict='pass') => api.get(`/api/milk/buyers?verdict=${verdict}`),
  sellMilk:        (data)           => api.post('/api/milk/sell', data),
  getTests:        (params={})      => api.get('/api/milk/tests', { params }),
  getStats:        ()               => api.get('/api/milk/stats'),
  getModelInfo:    ()               => api.get('/api/milk/model-info'),
}

// ── Module 4 — Finance ───────────────────────────────────────────────────────
export const financeAPI = {
  getDashboard: ()         => api.get('/api/finance/dashboard'),
  getRanking:   (period='all') => api.get(`/api/finance/ranking?period=${period}`),
  getCowStats:  (id)       => api.get(`/api/finance/cow-stats/${id}`),
  getDailyReport:(date='') => api.get(`/api/finance/daily-report${date?`?report_date=${date}`:''}`),
  getPLReport:  ()         => api.get('/api/finance/pl-report'),
  getForecast:  ()         => api.get('/api/finance/price-forecast'),
  getLedger:    (params={})=> api.get('/api/finance/ledger', { params }),
  addExpense:   (data)     => api.post('/api/finance/expense', data),
  addMilkSale:  (data)     => api.post('/api/finance/milk-sale', data),
  getBuyers:    ()         => api.get('/api/finance/buyers'),
}

export default api
