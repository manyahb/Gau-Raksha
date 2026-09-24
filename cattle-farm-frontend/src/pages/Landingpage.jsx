import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

/* ─────────────────────────────────────────
   Inline styles: landing page has its own
   full-bleed design independent of index.css
───────────────────────────────────────── */
const S = {
  page: {
    fontFamily: "'DM Sans', sans-serif",
    background: '#0d1a0f',
    color: '#fff',
    minHeight: '100vh',
    overflowX: 'hidden',
    WebkitFontSmoothing: 'antialiased',
  },

  /* NAV */
  nav: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
    height: 68,
    background: 'rgba(22,35,20,0.9)',
    backdropFilter: 'blur(20px) saturate(1.4)',
    WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    display: 'flex', alignItems: 'center',
    padding: '0 2.5rem', gap: '1.5rem',
  },
  navBrand: {
    display: 'flex', alignItems: 'center', gap: 10,
    textDecoration: 'none', cursor: 'pointer',
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800, fontSize: 19,
    color: '#22c97a', letterSpacing: '-0.02em',
    background: 'none', border: 'none',
  },
  navBrandIcon: {
    width: 34, height: 34, borderRadius: 9,
    background: 'rgba(34,201,122,0.12)',
    border: '1px solid rgba(34,201,122,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18,
  },
  navLinks: { display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' },
  navLink: {
    padding: '8px 16px', borderRadius: 8,
    fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.72)',
    textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'color 0.15s, background 0.15s',
  },
  navCta: {
    marginLeft: 8,
    padding: '9px 22px',
    background: '#22c97a', color: '#041209',
    fontWeight: 700, fontSize: 13.5,
    borderRadius: 9, border: 'none', cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: '0.01em',
    transition: 'background 0.15s',
  },

  /* HERO */
  hero: {
    position: 'relative', width: '100%',
    minHeight: '100vh',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', paddingTop: 68,
  },
  heroBg: { position: 'absolute', inset: 0, zIndex: 0 },
  heroOverlay: {
    position: 'absolute', inset: 0, zIndex: 1,
    background: `linear-gradient(
      to bottom,
      rgba(8,12,8,0.30) 0%,
      rgba(8,12,8,0.15) 30%,
      rgba(8,12,8,0.52) 72%,
      rgba(8,12,8,0.90) 100%
    )`,
  },
  heroContent: {
    position: 'relative', zIndex: 2,
    textAlign: 'center', padding: '0 1.5rem',
    maxWidth: 920,
  },
  heroBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '6px 18px', borderRadius: 24,
    background: 'rgba(34,201,122,0.10)',
    border: '1px solid rgba(34,201,122,0.28)',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, letterSpacing: '0.13em', color: '#22c97a',
    textTransform: 'uppercase', marginBottom: '1.6rem',
  },
  heroBadgeDot: {
    width: 6, height: 6, borderRadius: '50%', background: '#22c97a',
  },
  heroH1: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 'clamp(42px, 7.5vw, 90px)',
    fontWeight: 800, lineHeight: 1.02,
    letterSpacing: '-0.027em', color: '#ffffff',
    marginBottom: '1.2rem',
    textShadow: '0 3px 28px rgba(0,0,0,0.55)',
  },
  heroAccent: { color: '#22c97a' },
  heroSub: {
    fontSize: 'clamp(14px, 2vw, 17px)', color: 'rgba(255,255,255,0.58)',
    fontWeight: 400, letterSpacing: '0.03em',
    marginBottom: '2.5rem', lineHeight: 1.55,
  },
  heroActions: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 14, flexWrap: 'wrap',
  },
  btnHeroPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '13px 34px',
    background: 'rgba(195,190,175,0.16)',
    border: '1px solid rgba(255,255,255,0.28)',
    backdropFilter: 'blur(8px)',
    color: '#fff',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 600, fontSize: 15,
    borderRadius: 10, cursor: 'pointer',
    letterSpacing: '0.02em',
    transition: 'all 0.2s',
  },
  btnHeroSecondary: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '13px 34px',
    background: '#22c97a', color: '#041209',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 700, fontSize: 15,
    borderRadius: 10, border: 'none', cursor: 'pointer',
    letterSpacing: '0.01em',
    boxShadow: '0 4px 28px rgba(34,201,122,0.32)',
    transition: 'all 0.2s',
  },

  /* STATS BAR */
  heroStats: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2,
    display: 'flex', justifyContent: 'center',
    padding: '0 2rem 2.5rem',
  },
  statsBar: {
    display: 'flex',
    background: 'rgba(15,24,17,0.88)',
    backdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 14, overflow: 'hidden',
  },
  statItem: {
    padding: '1rem 2.2rem', textAlign: 'center',
    borderRight: '1px solid rgba(255,255,255,0.06)',
  },
  statValue: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 26, fontWeight: 800,
    color: '#22c97a', lineHeight: 1.1,
  },
  statLabel: {
    fontSize: 11.5, color: 'rgba(255,255,255,0.4)',
    marginTop: 3, letterSpacing: '0.04em',
  },

  /* FEATURES */
  features: {
    background: '#0a1009',
    padding: '5.5rem 2rem',
    position: 'relative',
  },
  sectionLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, color: '#22c97a',
    letterSpacing: '0.15em', textTransform: 'uppercase',
    textAlign: 'center', marginBottom: '0.6rem',
  },
  sectionTitle: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 'clamp(26px, 4vw, 42px)',
    fontWeight: 800, textAlign: 'center',
    color: '#dff2e8', letterSpacing: '-0.022em',
    lineHeight: 1.1, marginBottom: '3.5rem',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: 1,
    maxWidth: 1100, margin: '0 auto',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 16, overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  featureCard: {
    background: '#101a12',
    padding: '2rem 1.75rem',
    transition: 'background 0.2s',
    cursor: 'pointer',
  },
  featureIcon: {
    width: 46, height: 46, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, marginBottom: '1rem',
  },
  featureTitle: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 16, fontWeight: 700,
    color: '#dff2e8', marginBottom: '0.5rem',
  },
  featureDesc: {
    fontSize: 13.5, color: 'rgba(255,255,255,0.38)',
    lineHeight: 1.65,
  },

  /* HOW IT WORKS */
  howSection: {
    background: '#0c1410',
    padding: '5rem 2rem',
    position: 'relative',
  },
  stepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 24, maxWidth: 900, margin: '0 auto',
  },
  stepCard: {
    textAlign: 'center', padding: '1.5rem 1rem',
  },
  stepNum: {
    width: 48, height: 48, borderRadius: '50%',
    background: 'rgba(34,201,122,0.12)',
    border: '1px solid rgba(34,201,122,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18,
    color: '#22c97a', margin: '0 auto 1rem',
  },
  stepTitle: {
    fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700,
    color: '#dff2e8', marginBottom: '0.5rem',
  },
  stepDesc: {
    fontSize: 13, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6,
  },

  /* CTA */
  ctaSection: {
    position: 'relative', padding: '5.5rem 2rem',
    textAlign: 'center', overflow: 'hidden',
    background: '#0a1009',
  },
  ctaTitle: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 'clamp(28px, 4.5vw, 46px)',
    fontWeight: 800, color: '#dff2e8',
    letterSpacing: '-0.025em', marginBottom: '1rem', lineHeight: 1.1,
  },
  ctaSub: {
    fontSize: 15, color: 'rgba(255,255,255,0.42)',
    maxWidth: 480, margin: '0 auto 2.5rem', lineHeight: 1.65,
  },

  /* FOOTER */
  footer: {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    padding: '1.5rem 2.5rem',
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
    background: '#0a1009',
  },
  footerBrand: {
    fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15,
    color: '#22c97a', display: 'flex', alignItems: 'center', gap: 7,
  },
  footerCopy: {
    fontSize: 12, color: 'rgba(255,255,255,0.25)',
    fontFamily: "'JetBrains Mono', monospace",
  },
}

/* ──────────── FARM SVG SCENE ──────────── */
function FarmScene() {
  return (
    <svg
      viewBox="0 0 1440 900"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <defs>
        <linearGradient id="lp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#14260f"/>
          <stop offset="100%" stopColor="#2a4820"/>
        </linearGradient>
        <linearGradient id="lp-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#c8a020"/>
          <stop offset="100%" stopColor="#876810"/>
        </linearGradient>
        <linearGradient id="lp-gold2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#d4b032"/>
          <stop offset="100%" stopColor="#9a7a18"/>
        </linearGradient>
        <linearGradient id="lp-tractor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#286020"/>
          <stop offset="100%" stopColor="#183e10"/>
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect width="1440" height="900" fill="url(#lp-sky)"/>

      {/* Distant hills */}
      <ellipse cx="280"  cy="312" rx="270" ry="58" fill="#1c3c12" opacity="0.75"/>
      <ellipse cx="780"  cy="298" rx="370" ry="52" fill="#223e16" opacity="0.65"/>
      <ellipse cx="1240" cy="308" rx="260" ry="48" fill="#1a3810" opacity="0.75"/>

      {/* Trees — left cluster */}
      <g opacity="0.88">
        <rect x="58"  y="270" width="9"  height="30" fill="#182e10"/>
        <ellipse cx="62"  cy="264" rx="17" ry="21" fill="#223c16"/>
        <rect x="106" y="274" width="8"  height="26" fill="#182e10"/>
        <ellipse cx="110" cy="268" rx="13" ry="17" fill="#1c3412"/>
        <rect x="144" y="277" width="8"  height="23" fill="#182e10"/>
        <ellipse cx="148" cy="271" rx="15" ry="19" fill="#284816"/>
      </g>
      {/* Trees — right cluster */}
      <g opacity="0.88">
        <rect x="938" y="266" width="10" height="32" fill="#182e10"/>
        <ellipse cx="943" cy="260" rx="19" ry="23" fill="#223c16"/>
        <rect x="982" y="272" width="8"  height="27" fill="#182e10"/>
        <ellipse cx="986" cy="266" rx="14" ry="18" fill="#1c3412"/>
        <rect x="1018" y="270" width="9" height="29" fill="#182e10"/>
        <ellipse cx="1022" cy="264" rx="16" ry="20" fill="#284816"/>
      </g>

      {/* Horizon hedge */}
      <rect x="0" y="313" width="1440" height="16" fill="#1c3212" opacity="0.9"/>

      {/* Far green field */}
      <path d="M0,313 Q360,298 720,311 Q1080,323 1440,313 L1440,392 Q1080,400 720,394 Q360,388 0,397 Z" fill="#386022" opacity="0.92"/>
      <g stroke="#285018" strokeWidth="1.5" opacity="0.45">
        <line x1="0" y1="333" x2="1440" y2="351"/>
        <line x1="0" y1="348" x2="1440" y2="366"/>
        <line x1="0" y1="363" x2="1440" y2="380"/>
        <line x1="0" y1="378" x2="1440" y2="392"/>
      </g>

      {/* Main golden wheat field */}
      <path d="M0,392 Q360,380 720,390 Q1080,400 1440,387 L1440,900 L0,900 Z" fill="url(#lp-gold)"/>

      {/* Perspective crop rows */}
      <g stroke="#9a7010" strokeWidth="2" opacity="0.4">
        {[-720,-540,-360,-180,0,180,360,540,720].map((offset,i) => (
          <line key={i} x1={720} y1={392} x2={720+offset*2} y2={900}/>
        ))}
      </g>
      {/* Horizontal depth bands */}
      <g stroke="#8a6008" strokeWidth="1.5" opacity="0.28">
        {[432,482,542,612,692,782].map(y => (
          <line key={y} x1="0" y1={y} x2="1440" y2={y}/>
        ))}
      </g>

      {/* Right field patch */}
      <path d="M880,387 Q1100,380 1440,387 L1440,760 Q1100,756 880,768 Z" fill="url(#lp-gold2)" opacity="0.52"/>

      {/* Left green strip (path/hedge) */}
      <path d="M0,402 Q80,397 135,412 L115,900 L0,900 Z" fill="#265018" opacity="0.72"/>

      {/* TRACTOR */}
      <g>
        {/* Body */}
        <rect x="90" y="424" width="70" height="44" rx="5" fill="url(#lp-tractor)"/>
        {/* Cab */}
        <rect x="128" y="409" width="34" height="27" rx="4" fill="#285a18"/>
        {/* Window */}
        <rect x="132" y="413" width="24" height="17" rx="2" fill="#183c0e" opacity="0.85"/>
        {/* Exhaust */}
        <rect x="155" y="403" width="5" height="13" fill="#182e10"/>
        <circle cx="157" cy="402" r="3" fill="#111808"/>
        {/* Rear wheel */}
        <circle cx="108" cy="470" r="27" fill="#101808"/>
        <circle cx="108" cy="470" r="21" fill="#0c1406"/>
        <circle cx="108" cy="470" r="7"  fill="#182e10"/>
        {/* Tread */}
        {[0,90,180,270].map(a => {
          const rad = a * Math.PI / 180
          const x1 = 108 + Math.cos(rad) * 21, y1 = 470 + Math.sin(rad) * 21
          const x2 = 108 + Math.cos(rad) * 27, y2 = 470 + Math.sin(rad) * 27
          return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#283018" strokeWidth="3"/>
        })}
        {/* Front wheel */}
        <circle cx="150" cy="470" r="15" fill="#101808"/>
        <circle cx="150" cy="470" r="11" fill="#0c1406"/>
        <circle cx="150" cy="470" r="4"  fill="#182e10"/>
        {/* Beacon */}
        <circle cx="111" cy="407" r="5" fill="#cc2020" opacity="0.92"/>
        {/* Headlight */}
        <ellipse cx="160" cy="449" rx="5" ry="4" fill="#f0e060" opacity="0.75"/>
      </g>

      {/* Atmospheric haze at horizon */}
      <rect x="0" y="290" width="1440" height="80" fill="url(#lp-sky)" opacity="0.22"/>
    </svg>
  )
}

/* ──────────── MODULES DATA ──────────── */
const MODULES = [
  {
    emoji: '🩺', label: 'Health Monitor', path: '/health',
    desc: 'Random Forest ML predicts cattle health risk from 6 vital parameters. Federated learning across farm nodes.',
    iconBg: 'rgba(34,201,122,0.12)', iconBorder: 'rgba(34,201,122,0.22)',
  },
  {
    emoji: '🤖', label: 'AI Vet Consultation', path: '/vet',
    desc: 'Gemma AI provides instant first aid advice. Locate nearby vets and launch live video consultations.',
    iconBg: 'rgba(96,168,240,0.12)', iconBorder: 'rgba(96,168,240,0.22)',
  },
  {
    emoji: '🥛', label: 'Milk Purity Checker', path: '/milk',
    desc: '6-parameter ML classifier checks fat, SNF, pH, bacteria count and generates PDF quality certificates.',
    iconBg: 'rgba(96,168,240,0.12)', iconBorder: 'rgba(96,168,240,0.22)',
  },
  {
    emoji: '₹', label: 'Finance Manager', path: '/finance',
    desc: 'Prophet ML forecasts milk prices. P&L reports, per-animal profit ranking, and buyer directory.',
    iconBg: 'rgba(240,160,48,0.12)', iconBorder: 'rgba(240,160,48,0.22)',
    labelStyle: { fontSize: 24, fontWeight: 700, fontFamily: "'Syne',sans-serif", color: '#f0a030' },
  },
]

const STEPS = [
  { n:'01', title:'Register Cattle',   desc:'Add your herd with tag numbers, breed, age, and weight details.' },
  { n:'02', title:'Monitor Health',    desc:'Log vitals daily. ML model predicts risk and flags issues early.' },
  { n:'03', title:'Test Milk Quality', desc:'Enter 6 parameters. Get instant pass/fail + PDF certificate.'    },
  { n:'04', title:'Track Finances',    desc:'Record sales and expenses. Prophet forecasts your next 14 days.'  },
]

/* ──────────── COMPONENT ──────────── */
export default function LandingPage() {
  const navigate = useNavigate()
  const [hoverModule, setHoverModule] = useState(null)
  const [navHover,    setNavHover]    = useState(null)

  // Load fonts
  useEffect(() => {
    const link = document.createElement('link')
    link.rel  = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400;500&display=swap'
    document.head.appendChild(link)
  }, [])

  return (
    <div style={S.page}>

      {/* ── NAVBAR ── */}
      <nav style={S.nav}>
        <button style={S.navBrand} onClick={() => navigate('/')}>
          <div style={S.navBrandIcon}>🐄</div>
          GauRaksha
        </button>

        <div style={S.navLinks}>
          {[
            { label: 'Home',      path: '/home'    },
            { label: 'About',     path: '#features' },
            { label: 'Dashboard', path: '/'         },
            { label: 'Contact',   path: '#cta'      },
          ].map(({ label, path }) => (
            <button
              key={label}
              style={{
                ...S.navLink,
                color: navHover === label ? '#fff' : 'rgba(255,255,255,0.72)',
                background: navHover === label ? 'rgba(255,255,255,0.06)' : 'transparent',
              }}
              onMouseEnter={() => setNavHover(label)}
              onMouseLeave={() => setNavHover(null)}
              onClick={() => path.startsWith('#')
                ? document.querySelector(path)?.scrollIntoView({ behavior: 'smooth' })
                : navigate(path)
              }
            >
              {label}
            </button>
          ))}
        </div>

        <button
          style={S.navCta}
          onClick={() => navigate('/')}
          onMouseEnter={e => e.currentTarget.style.background = '#28d988'}
          onMouseLeave={e => e.currentTarget.style.background = '#22c97a'}
        >
          Open Dashboard →
        </button>
      </nav>

      {/* ── HERO ── */}
      <section style={S.hero}>
        <div style={S.heroBg}><FarmScene /></div>
        <div style={S.heroOverlay}/>

        <div style={{
          ...S.heroContent,
          animation: 'lpFadeUp 0.9s cubic-bezier(0.16,1,0.3,1) forwards',
          opacity: 0,
        }}>
          <div style={S.heroBadge}>
            <div style={{ ...S.heroBadgeDot, animation: 'lpPulse 2s infinite' }}/>
            Innovative Farm Tech Solutions
          </div>

          <h1 style={S.heroH1}>
            Transforming<br/>
            <span style={S.heroAccent}>Farming</span> Technologies
          </h1>

          <p style={S.heroSub}>
            AI-powered cattle health monitoring, milk purity analysis,<br/>
            and financial management — built for Indian farmers.
          </p>

          <div style={S.heroActions}>
            <button
              style={S.btnHeroPrimary}
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.24)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.48)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(195,190,175,0.16)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)' }}
            >
              Explore More
            </button>
            <button
              style={S.btnHeroSecondary}
              onClick={() => navigate('/')}
              onMouseEnter={e => { e.currentTarget.style.background = '#28d988'; e.currentTarget.style.boxShadow = '0 6px 36px rgba(34,201,122,0.45)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#22c97a'; e.currentTarget.style.boxShadow = '0 4px 28px rgba(34,201,122,0.32)' }}
            >
              Open Dashboard →
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div style={S.heroStats}>
          <div style={{ ...S.statsBar, animation: 'lpFadeUp 1s 0.35s cubic-bezier(0.16,1,0.3,1) forwards', opacity: 0 }}>
            {[
              { value:'48+',  label:'Cattle Monitored'  },
              { value:'312L', label:'Daily Milk Output'  },
              { value:'98%',  label:'Purity Accuracy'    },
              { value:'2',    label:'Farm Nodes Active'  },
            ].map((s, i) => (
              <div key={i} style={{ ...S.statItem, borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <div style={S.statValue}>{s.value}</div>
                <div style={S.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={S.features} id="features">
        {/* Divider line */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3.5rem' }}>
          <div style={{ width: 1, height: 56, background: 'linear-gradient(to bottom, transparent, rgba(34,201,122,0.4), transparent)' }}/>
        </div>

        <p style={S.sectionLabel}>Platform Modules</p>
        <h2 style={S.sectionTitle}>Everything your farm needs</h2>

        <div style={S.featuresGrid}>
          {MODULES.map((m, i) => (
            <div
              key={i}
              style={{
                ...S.featureCard,
                background: hoverModule === i ? '#152018' : '#101a12',
              }}
              onMouseEnter={() => setHoverModule(i)}
              onMouseLeave={() => setHoverModule(null)}
              onClick={() => navigate(m.path)}
            >
              <div style={{ ...S.featureIcon, background: m.iconBg, border: `1px solid ${m.iconBorder}` }}>
                {m.labelStyle
                  ? <span style={m.labelStyle}>{m.emoji}</span>
                  : <span style={{ fontSize: 22 }}>{m.emoji}</span>
                }
              </div>
              <div style={S.featureTitle}>{m.label}</div>
              <div style={S.featureDesc}>{m.desc}</div>
              <div style={{
                marginTop: '1.1rem', fontSize: 12.5, color: '#22c97a',
                opacity: hoverModule === i ? 1 : 0,
                transition: 'opacity 0.2s',
                fontFamily: "'JetBrains Mono',monospace",
              }}>
                Open module →
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={S.howSection}>
        <p style={S.sectionLabel}>Workflow</p>
        <h2 style={S.sectionTitle}>How it works</h2>
        <div style={S.stepsGrid}>
          {STEPS.map((step, i) => (
            <div key={i} style={S.stepCard}>
              <div style={S.stepNum}>{step.n}</div>
              <div style={S.stepTitle}>{step.title}</div>
              <div style={S.stepDesc}>{step.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={S.ctaSection} id="cta">
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 65% 55% at 50% 50%, rgba(34,201,122,0.07) 0%, transparent 70%)',
        }}/>
        <p style={S.sectionLabel}>Get Started</p>
        <h2 style={S.ctaTitle}>Ready to modernise your farm?</h2>
        <p style={S.ctaSub}>
          Join farmers across Karnataka using AI and ML to improve cattle health and increase profits.
        </p>
        <button
          style={{ ...S.btnHeroSecondary, fontSize: 15, padding: '14px 40px' }}
          onClick={() => navigate('/')}
          onMouseEnter={e => { e.currentTarget.style.background = '#28d988'; e.currentTarget.style.boxShadow = '0 6px 36px rgba(34,201,122,0.48)' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#22c97a'; e.currentTarget.style.boxShadow = '0 4px 28px rgba(34,201,122,0.32)' }}
        >
          Open Dashboard →
        </button>
      </section>

      {/* ── FOOTER ── */}
      <footer style={S.footer}>
        <div style={S.footerBrand}>
          <span style={{ fontSize: 18 }}>🐄</span> GauRaksha
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {[['Dashboard','/'],['Health','/health'],['Vet & AI','/vet'],['Milk','/milk'],['Finance','/finance']].map(([l,p]) => (
            <button key={l}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Sans',sans-serif" }}
              onClick={() => navigate(p)}>
              {l}
            </button>
          ))}
        </div>
        <div style={S.footerCopy}>© 2026 GauRaksha · Mysuru, Karnataka</div>
      </footer>

      {/* ── KEYFRAMES ── */}
      <style>{`
        @keyframes lpFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lpPulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.35; }
        }
      `}</style>
    </div>
  )
}