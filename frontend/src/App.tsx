import { useState, useRef, useEffect } from 'react'
import './App.css'

// ─── Types ───────────────────────────────────────────────────────────────────
interface FactCheckItem {
  claim: string
  verdict: string
  source_name: string
  source_url: string
  checked_date: string | null
  similarity_score: number
}

interface SourceCredibilityItem {
  source_name: string
  domain: string
  credibility_score: number
  category: string
  notes: string | null
  status: string
}

interface WordImportanceItem {
  word: string;
  weight: number;
  is_fake_indicator: boolean;
}

interface PredictionResult {
  submission_id: number
  prediction_id: number
  label: 'fake' | 'real'
  confidence_score: number
  fake_probability: number | null
  real_probability: number | null
  explanation: string
  word_importances?: WordImportanceItem[]
  fact_check_results?: FactCheckItem[]
  source_credibility?: SourceCredibilityItem | null
  model_version: { id: number; model_name: string; algorithm: string }
  processing_time_ms: number
}

interface HistoryItem {
  prediction_id: number
  submitted_at: string
  label: string
  confidence_score: number
  source_type: string
  content: string
}

interface Analytics {
  total_users: number
  total_submissions: number
  distribution: { fake: number; real: number }
  active_model_id: number
  accuracy_percentage: number
}

interface ReportItem {
  id: number
  report_type: string
  title: string
  file_path: string
  generated_at: string
}

interface ModelItem {
  id: number
  model_name: string
  algorithm: string
  accuracy: number | null
  precision_score: number | null
  recall_score: number | null
  f1_score: number | null
  is_active: boolean
  trained_at: string
}

interface TrendingItem {
  id: number
  content: string
  label: 'fake' | 'real'
  confidence_score: number
  submitted_at: string
}

type Tab = 'analyze' | 'history' | 'reports' | 'dashboard'
type InputType = 'text' | 'url' | 'image'

const API = 'http://localhost:8000/api'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

function ConfidenceBar({ value, color }: { value: number; color: string }) {
  const [width, setWidth] = useState(0)
  useEffect(() => { setTimeout(() => setWidth(value * 100), 100) }, [value])
  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 99, height: 8, overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: 99, background: color,
        width: `${width}%`, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)'
      }} />
    </div>
  )
}

// ─── Icons (inline SVG) ──────────────────────────────────────────────────────
const IconSearch = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
const IconHistory = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
const IconDash = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
const IconAlert = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
const IconCheck = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
const IconLink = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
const IconText = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 6.1H3"/><path d="M21 12.1H3"/><path d="M15.1 18H3"/></svg>
const IconImage = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
const IconReports = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
const IconFile = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>

// ─── Explainable AI Highlighting Component ──────────────────────────────────
function HighlightedText({ text, importances }: { text: string; importances?: WordImportanceItem[] }) {
  if (!importances || importances.length === 0) return <span>{text}</span>;

  // Create a map of lowercase words to highlight styles
  const importanceMap = new Map<string, WordImportanceItem>(
    importances.map(imp => [imp.word.toLowerCase(), imp])
  );

  // Tokenize text including punctuation and whitespace
  const tokens = text.split(/(\b\w+\b)/g);

  return (
    <>
      {tokens.map((token, i) => {
        const lower = token.toLowerCase();
        const imp = importanceMap.get(lower);
        if (imp) {
          const color = imp.is_fake_indicator ? 'rgba(244,63,94,0.18)' : 'rgba(16,185,129,0.18)';
          const border = imp.is_fake_indicator ? '1px solid rgba(244,63,94,0.35)' : '1px solid rgba(16,185,129,0.35)';
          const textColor = imp.is_fake_indicator ? '#fda4af' : '#a7f3d0';
          return (
            <span key={i} style={{
              background: color,
              border: border,
              color: textColor,
              padding: '2px 4px',
              borderRadius: 4,
              fontWeight: 500,
              margin: '0 1px'
            }} title={`Weight contribution: ${imp.weight}`}>
              {token}
            </span>
          );
        }
        return <span key={i}>{token}</span>;
      })}
    </>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState<Tab>('analyze')
  const [inputType, setInputType] = useState<InputType>('text')
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PredictionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)

  // Report states
  const [reports, setReports] = useState<ReportItem[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [activeReportContent, setActiveReportContent] = useState<string | null>(null)
  const [viewingReport, setViewingReport] = useState<ReportItem | null>(null)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [reportTitleInput, setReportTitleInput] = useState('')
  const [reportTypeInput, setReportTypeInput] = useState('prediction_summary')
  const [showGenerateReportModal, setShowGenerateReportModal] = useState(false)

  // Model states (for admin dashboard)
  const [models, setModels] = useState<ModelItem[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [activatingModelId, setActivatingModelId] = useState<number | null>(null)
  
  // Trending news states (for admin dashboard)
  const [trendingNews, setTrendingNews] = useState<TrendingItem[]>([])
  const [trendingLoading, setTrendingLoading] = useState(false)

  // Detail view states
  const [selectedPrediction, setSelectedPrediction] = useState<any | null>(null)
  const [predictionDetailLoading, setPredictionDetailLoading] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // ── Auth State ─────────────────────────────────────────────────────────────
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [user, setUser] = useState<{ id: number; full_name: string; email: string; role: string } | null>(null)
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authName, setAuthName] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)

  // ── Fetch user profile when token changes ──────────────────────────────────
  useEffect(() => {
    if (token) {
      fetchUser()
    } else {
      setUser(null)
    }
  }, [token])

  async function fetchUser() {
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const userData = await res.json()
        setUser(userData)
      } else {
        handleLogout()
      }
    } catch {
      handleLogout()
    }
  }

  function handleLogout() {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    setResult(null)
    setError(null)
    setContent('')
    setTab('analyze')
  }

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError(null)
    try {
      if (isRegisterMode) {
        const registerRes = await fetch(`${API}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: authName,
            email: authEmail,
            password: authPassword
          })
        })
        if (!registerRes.ok) {
          const errData = await registerRes.json().catch(() => ({}))
          throw new Error(errData.detail || 'Registration failed')
        }
      }
      
      const loginRes = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword
        })
      })
      if (!loginRes.ok) {
        const errData = await loginRes.json().catch(() => ({}))
        throw new Error(errData.detail || 'Incorrect email or password.')
      }
      
      const tokenData = await loginRes.json()
      localStorage.setItem('token', tokenData.access_token)
      setToken(tokenData.access_token)
      
      setAuthEmail('')
      setAuthPassword('')
      setAuthName('')
    } catch (err: any) {
      setAuthError(err.message || 'Server connection failed.')
    } finally {
      setAuthLoading(false)
    }
  }

  // ── Fetch history, analytics, models & reports when tabs open ───────────────
  useEffect(() => {
    if (tab === 'history') loadHistory()
    if (tab === 'dashboard') {
      loadAnalytics()
      loadModels()
      loadTrendingNews()
    }
    if (tab === 'reports') loadReports()
  }, [tab])

  async function loadModels() {
    if (!token) return
    setModelsLoading(true)
    try {
      const res = await fetch(`${API}/admin/models`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setModels(await res.json())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setModelsLoading(false)
    }
  }

  async function loadTrendingNews() {
    if (!token) return
    setTrendingLoading(true)
    try {
      const res = await fetch(`${API}/admin/trending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setTrendingNews(await res.json())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setTrendingLoading(false)
    }
  }

  async function activateModel(modelId: number) {
    if (!token) return
    setActivatingModelId(modelId)
    try {
      const res = await fetch(`${API}/admin/models/${modelId}/activate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        // Refresh models and analytics
        await loadModels()
        await loadAnalytics()
      } else {
        alert("Failed to activate model version.")
      }
    } catch (e) {
      console.error(e)
      alert("Error activating model version.")
    } finally {
      setActivatingModelId(null)
    }
  }

  async function loadReports() {
    if (!token) return
    setReportsLoading(true)
    try {
      const res = await fetch(`${API}/reports`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setReports(data.items)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setReportsLoading(false)
    }
  }

  async function handleGenerateReport(e: React.FormEvent) {
    e.preventDefault()
    if (!reportTitleInput.trim()) return
    if (!token) return
    setGeneratingReport(true)
    try {
      const res = await fetch(`${API}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          report_type: reportTypeInput,
          title: reportTitleInput.trim()
        })
      })
      if (res.ok) {
        setReportTitleInput('')
        setShowGenerateReportModal(false)
        await loadReports()
      } else {
        alert("Failed to generate report.")
      }
    } catch (e) {
      console.error(e)
      alert("Error generating report.")
    } finally {
      setGeneratingReport(false)
    }
  }

  async function viewReportContent(report: ReportItem) {
    if (!token) return
    setViewingReport(report)
    setActiveReportContent(null)
    try {
      const res = await fetch(`${API}/reports/${report.id}/content`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setActiveReportContent(data.content)
      } else {
        setActiveReportContent("Failed to load report content.")
      }
    } catch (e) {
      console.error(e)
      setActiveReportContent("Error loading report content.")
    }
  }

  async function loadPredictionDetail(predictionId: number) {
    if (!token) return
    setPredictionDetailLoading(true)
    setSelectedPrediction(null)
    setShowDetailModal(true)
    try {
      const res = await fetch(`${API}/predictions/${predictionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setSelectedPrediction(await res.json())
      } else {
        alert("Failed to load prediction details.")
      }
    } catch (e) {
      console.error(e)
      alert("Error loading prediction details.")
    } finally {
      setPredictionDetailLoading(false)
    }
  }

  async function loadHistory() {
    if (!token) return
    setHistoryLoading(true)
    try {
      const res = await fetch(`${API}/predictions/history?page=1&page_size=20`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.status === 401) {
        handleLogout()
        return
      }
      if (!res.ok) throw new Error('Failed to load history')
      const data = await res.json()
      setHistory(data.items)
    } catch {
      // ignore – show empty state
    } finally {
      setHistoryLoading(false)
    }
  }

  async function loadAnalytics() {
    if (!token) return
    setAnalyticsLoading(true)
    try {
      const res = await fetch(`${API}/admin/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.status === 401) {
        handleLogout()
        return
      }
      if (!res.ok) throw new Error()
      setAnalytics(await res.json())
    } catch {
      // ignore
    } finally {
      setAnalyticsLoading(false)
    }
  }

  async function handleAnalyze() {
    if (inputType !== 'image' && !content.trim()) {
      textRef.current?.focus()
      return
    }
    if (inputType === 'image' && !imageFile) return
    if (!token) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      let res;
      if (inputType === 'image') {
        const formData = new FormData()
        formData.append('file', imageFile as File)
        res = await fetch(`${API}/predictions/image`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        })
      } else {
        res = await fetch(`${API}/predictions`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ input_type: inputType, content: content.trim() })
        })
      }
      if (res.status === 401) {
        handleLogout()
        return
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Server error ${res.status}`)
      }
      setResult(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Connection failed – is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setContent('')
    setImageFile(null)
    setImagePreviewUrl(null)
    setResult(null)
    setError(null)
    if (inputType !== 'image') {
      setTimeout(() => textRef.current?.focus(), 100)
    }
  }

  // ── Render Auth View if not authenticated ──────────────────────────────────
  if (!token) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at center, #1e1b4b 0%, #0a0a0f 100%)',
        padding: 24,
        fontFamily: 'Inter, sans-serif',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow Effects */}
        <div style={{
          position: 'absolute', width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
          top: '20%', left: '15%', zIndex: 0, pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(236,72,153,0.1) 0%, transparent 70%)',
          bottom: '20%', right: '15%', zIndex: 0, pointerEvents: 'none'
        }} />

        <div style={{
          width: '100%', maxWidth: 420,
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 24,
          padding: '40px 32px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 40px rgba(124,58,237,0.1)',
          zIndex: 1,
          position: 'relative'
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 24px rgba(124,58,237,0.6)'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 24, color: '#f0f0ff', letterSpacing: '-0.5px' }}>TruthGuard</div>
              <div style={{ fontSize: 13, color: '#8888aa', marginTop: 4 }}>AI-Powered Fake News Detection</div>
            </div>
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e2e8f0', marginBottom: 24, textAlign: 'center' }}>
            {isRegisterMode ? 'Create your account' : 'Sign in to TruthGuard'}
          </h2>

          {authError && (
            <div style={{
              padding: '12px 16px', borderRadius: 12, marginBottom: 20,
              background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)',
              color: '#fda4af', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8
            }}>
              <IconAlert /> {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {isRegisterMode && (
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#8888aa', marginBottom: 6, fontWeight: 500 }}>Full Name</label>
                <input
                  type="text"
                  required
                  value={authName}
                  onChange={e => setAuthName(e.target.value)}
                  placeholder="John Doe"
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
                    color: '#f0f0ff', fontSize: 14, outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#8888aa', marginBottom: 6, fontWeight: 500 }}>Email Address</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
                placeholder="name@example.com"
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
                  color: '#f0f0ff', fontSize: 14, outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#8888aa', marginBottom: 6, fontWeight: 500 }}>Password</label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
                  color: '#f0f0ff', fontSize: 14, outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              style={{
                width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white',
                fontSize: 14, fontWeight: 600, cursor: authLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(124,58,237,0.3)', marginTop: 8,
                transition: 'opacity 0.2s'
              }}
            >
              {authLoading ? 'Please wait...' : isRegisterMode ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#8888aa' }}>
            {isRegisterMode ? 'Already have an account? ' : "Don't have an account? "}
            <button
              onClick={() => {
                setIsRegisterMode(!isRegisterMode)
                setAuthError(null)
                setAuthEmail('')
                setAuthPassword('')
                setAuthName('')
              }}
              style={{
                background: 'none', border: 'none', color: '#a855f7',
                fontWeight: 600, cursor: 'pointer', padding: 0
              }}
            >
              {isRegisterMode ? 'Sign In' : 'Sign Up'}
            </button>
          </div>

          <div style={{ marginTop: 20, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16, fontSize: 12, color: '#55556a', textAlign: 'center' }}>
            💡 Demo Accounts:<br />
            <strong>user@truthguard.com</strong> / <strong>userpassword</strong><br />
            <strong>admin@truthguard.com</strong> / <strong>adminpassword</strong>
          </div>
        </div>
      </div>
    )
  }

  // ── Render Authenticated Main App ──────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── Header ── */}
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(10,10,15,0.85)',
        backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(124,58,237,0.5)'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#f0f0ff', letterSpacing: '-0.3px' }}>TruthGuard</div>
              <div style={{ fontSize: 11, color: '#55556a', letterSpacing: '0.5px' }}>AI Fake News Detector</div>
            </div>
          </div>

          {/* Nav tabs */}
          <nav style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 12 }}>
            {([
              { id: 'analyze', label: 'Analyze', icon: <IconSearch /> },
              { id: 'history', label: 'History', icon: <IconHistory /> },
              { id: 'reports', label: 'Reports', icon: <IconReports /> },
              ...(user?.role === 'admin' ? [{ id: 'dashboard', label: 'Dashboard', icon: <IconDash /> }] : []),
            ] as const).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 500, fontFamily: 'Inter, sans-serif',
                background: tab === t.id ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'transparent',
                color: tab === t.id ? '#fff' : '#8888aa',
                transition: 'all 0.2s',
                boxShadow: tab === t.id ? '0 0 16px rgba(124,58,237,0.4)' : 'none',
              }}>
                {t.icon}{t.label}
              </button>
            ))}
          </nav>

          {/* Profile & Sign Out */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {user && (
              <div style={{ fontSize: 13, color: '#f0f0ff', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>👤 {user.full_name}</span>
                <span style={{ fontSize: 10, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', padding: '2px 6px', borderRadius: 4, textTransform: 'capitalize', fontWeight: 600, color: '#c084fc' }}>{user.role}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8888aa' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
              Live
            </div>
            <button onClick={handleLogout} style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              padding: '6px 12px', borderRadius: 8, color: '#8888aa', fontSize: 12, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', transition: 'all 0.2s'
            }}
              onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; (e.currentTarget as HTMLElement).style.background = 'rgba(244,63,94,0.15)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(244,63,94,0.3)' }}
              onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = '#8888aa'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main style={{ flex: 1, maxWidth: 1100, margin: '0 auto', width: '100%', padding: '40px 24px' }}>

        {/* ════════ ANALYZE TAB ════════ */}
        {tab === 'analyze' && (
          <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap: 32, transition: 'all 0.4s' }}>

            {/* Left: Input */}
            <div>
              <h1 style={{
                fontSize: 40, fontWeight: 800, letterSpacing: '-1.5px',
                background: 'linear-gradient(135deg, #f0f0ff 0%, #a855f7 60%, #ec4899 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                marginBottom: 8, lineHeight: 1.15
              }}>
                Detect Fake News<br />with AI
              </h1>
              <p style={{ color: '#8888aa', fontSize: 16, marginBottom: 32 }}>
                Paste a news article or URL — our ML model analyzes it instantly.
              </p>

              {/* Input type toggle */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {(['text', 'url', 'image'] as const).map(t => (
                  <button key={t} onClick={() => { setInputType(t); setContent(''); setImageFile(null); setImagePreviewUrl(null) }} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 18px', borderRadius: 8, border: '1px solid',
                    borderColor: inputType === t ? '#7c3aed' : 'rgba(255,255,255,0.08)',
                    background: inputType === t ? 'rgba(124,58,237,0.15)' : 'transparent',
                    color: inputType === t ? '#a855f7' : '#8888aa',
                    cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: 'Inter, sans-serif',
                    transition: 'all 0.2s'
                  }}>
                    {t === 'text' ? <IconText /> : t === 'url' ? <IconLink /> : <IconImage />}
                    {t === 'text' ? 'News Text' : t === 'url' ? 'URL' : 'Image Upload'}
                  </button>
                ))}
              </div>

              {/* Input field */}
              <div style={{ position: 'relative', marginBottom: 16 }}>
                {inputType === 'text' ? (
                  <textarea
                    ref={textRef}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Paste your news article text here…"
                    rows={10}
                    style={{
                      width: '100%', padding: '16px', borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.04)',
                      color: '#f0f0ff', fontSize: 15, lineHeight: 1.7,
                      fontFamily: 'Inter, sans-serif', resize: 'vertical',
                      outline: 'none', transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.6)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                ) : inputType === 'url' ? (
                  <input
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="https://example.com/news-article"
                    onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                    style={{
                      width: '100%', padding: '14px 16px', borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.04)',
                      color: '#f0f0ff', fontSize: 15,
                      fontFamily: 'Inter, sans-serif',
                      outline: 'none', boxSizing: 'border-box'
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.6)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                ) : (
                  <div style={{
                    width: '100%', padding: '40px', borderRadius: 12,
                    border: '2px dashed rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.02)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.2s', boxSizing: 'border-box'
                  }}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#a855f7' }}
                  onDragLeave={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
                  onDrop={e => {
                    e.preventDefault()
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const file = e.dataTransfer.files[0]
                      setImageFile(file)
                      setImagePreviewUrl(URL.createObjectURL(file))
                    }
                  }}
                  onClick={() => document.getElementById('image-upload-input')?.click()}
                  >
                    <input id="image-upload-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0]
                        setImageFile(file)
                        setImagePreviewUrl(URL.createObjectURL(file))
                      }
                    }} />
                    {imagePreviewUrl ? (
                      <img src={imagePreviewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} />
                    ) : (
                      <>
                        <div style={{ color: '#8888aa', marginBottom: 12, transform: 'scale(1.5)' }}><IconImage /></div>
                        <div style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Click or drag an image here</div>
                        <div style={{ color: '#55556a', fontSize: 13 }}>Supports JPG, PNG, WEBP</div>
                      </>
                    )}
                  </div>
                )}
                {inputType !== 'image' && (
                  <div style={{ position: 'absolute', bottom: 10, right: 12, fontSize: 12, color: '#55556a' }}>
                    {content.length} chars
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  padding: '12px 16px', borderRadius: 10, marginBottom: 16,
                  background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)',
                  color: '#fda4af', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <IconAlert /> {error}
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  id="analyze-btn"
                  onClick={handleAnalyze}
                  disabled={loading || (inputType !== 'image' && !content.trim()) || (inputType === 'image' && !imageFile)}
                  style={{
                    flex: 1, padding: '14px 24px', borderRadius: 12, border: 'none',
                    background: loading || (inputType !== 'image' && !content.trim()) || (inputType === 'image' && !imageFile) ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
                    color: 'white', fontSize: 16, fontWeight: 600, fontFamily: 'Inter, sans-serif',
                    cursor: loading || (inputType !== 'image' && !content.trim()) || (inputType === 'image' && !imageFile) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: loading || (inputType !== 'image' && !content.trim()) || (inputType === 'image' && !imageFile) ? 'none' : '0 0 24px rgba(124,58,237,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                  }}
                >
                  {loading ? (
                    <>
                      <span style={{
                        width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)',
                        borderTop: '2px solid white', borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite', display: 'inline-block'
                      }} />
                      Analyzing…
                    </>
                  ) : (
                    <><IconSearch /> Analyze</>
                  )}
                </button>
                {(result || content || imageFile) && (
                  <button onClick={handleReset} style={{
                    padding: '14px 20px', borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent', color: '#8888aa',
                    fontSize: 15, fontFamily: 'Inter, sans-serif',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}>
                    Clear
                  </button>
                )}
              </div>

              {/* Example prompts */}
              {!result && !content && !imageFile && (
                <div style={{ marginTop: 28 }}>
                  <p style={{ fontSize: 13, color: '#55556a', marginBottom: 12 }}>Try an example:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      'SHOCKING: Secrets regarding miracle cures that corporations suppress are finally exposed!',
                      'Researchers at the university announced a new program to expand access to primary healthcare.',
                    ].map((ex, i) => (
                      <button key={i} onClick={() => { setContent(ex); setInputType('text') }} style={{
                        textAlign: 'left', padding: '10px 14px', borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.07)',
                        background: 'rgba(255,255,255,0.03)', color: '#8888aa',
                        fontSize: 13, fontFamily: 'Inter, sans-serif',
                        cursor: 'pointer', transition: 'all 0.2s',
                        lineHeight: 1.5
                      }}
                        onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.4)'; (e.currentTarget as HTMLElement).style.color = '#f0f0ff' }}
                        onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = '#8888aa' }}
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Result */}
            {result && (
              <div style={{ animation: 'slideIn 0.4s ease-out' }}>
                <div style={{
                  borderRadius: 20, overflow: 'hidden',
                  border: `1px solid ${result.label === 'fake' ? 'rgba(244,63,94,0.3)' : 'rgba(16,185,129,0.3)'}`,
                  background: result.label === 'fake' ? 'rgba(244,63,94,0.06)' : 'rgba(16,185,129,0.06)',
                  boxShadow: result.label === 'fake' ? '0 0 40px rgba(244,63,94,0.15)' : '0 0 40px rgba(16,185,129,0.15)'
                }}>
                  {/* Header */}
                  <div style={{
                    padding: '28px 28px 24px',
                    borderBottom: `1px solid ${result.label === 'fake' ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.15)'}`,
                    display: 'flex', alignItems: 'center', gap: 16
                  }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 14,
                      background: result.label === 'fake' ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: result.label === 'fake' ? '#f43f5e' : '#10b981',
                      flexShrink: 0
                    }}>
                      {result.label === 'fake' ? <IconAlert /> : <IconCheck />}
                    </div>
                    <div>
                      <div style={{
                        fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px',
                        color: result.label === 'fake' ? '#f43f5e' : '#10b981'
                      }}>
                        {result.label === 'fake' ? (inputType === 'image' ? '⚠ AI-GENERATED IMAGE' : '⚠ FAKE NEWS') : (inputType === 'image' ? '✓ AUTHENTIC IMAGE' : '✓ LIKELY REAL')}
                      </div>
                      <div style={{ fontSize: 14, color: '#8888aa', marginTop: 2 }}>
                        {Math.round(result.confidence_score * 100)}% confidence
                      </div>
                    </div>
                  </div>

                  {/* Probabilities */}
                  <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: 12, color: '#55556a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14 }}>
                      Probability Breakdown
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                          <span style={{ color: '#f43f5e', fontWeight: 600 }}>Fake</span>
                          <span style={{ color: '#f0f0ff' }}>{Math.round((result.fake_probability ?? 0) * 100)}%</span>
                        </div>
                        <ConfidenceBar value={result.fake_probability ?? 0} color="linear-gradient(90deg,#f43f5e,#fb7185)" />
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                          <span style={{ color: '#10b981', fontWeight: 600 }}>Real</span>
                          <span style={{ color: '#f0f0ff' }}>{Math.round((result.real_probability ?? 0) * 100)}%</span>
                        </div>
                        <ConfidenceBar value={result.real_probability ?? 0} color="linear-gradient(90deg,#10b981,#34d399)" />
                      </div>
                    </div>
                  </div>

                  {/* Explanation */}
                  <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: 12, color: '#55556a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Analysis</p>
                    <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.65 }}>{result.explanation}</p>
                  </div>

                  {/* Explainable AI (Feature Highlighting) */}
                  <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: 12, color: '#55556a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Explainable AI (Feature Highlighting)</p>
                    <div style={{
                      background: 'rgba(0,0,0,0.2)',
                      padding: 16,
                      borderRadius: 12,
                      fontSize: 14,
                      color: '#d1d5db',
                      lineHeight: 1.7,
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      <HighlightedText text={content} importances={result.word_importances} />
                    </div>
                    <p style={{ fontSize: 11, color: '#55556a', marginTop: 8 }}>
                      💡 Green words indicate features contributing towards a REAL verdict, and red words indicate features towards a FAKE verdict. Hover to see weights.
                    </p>
                  </div>

                  {/* Source Credibility */}
                  {result.source_credibility && result.source_credibility.category !== 'not_applicable' && (
                    <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <p style={{ fontSize: 12, color: '#55556a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14 }}>Source Credibility Assessment</p>
                      <div style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        padding: 16,
                        borderRadius: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#f0f0ff' }}>
                              {result.source_credibility.source_name}
                            </span>
                            <span style={{ fontSize: 12, color: '#8888aa', display: 'block', marginTop: 2 }}>
                              Domain: {result.source_credibility.domain}
                            </span>
                          </div>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: result.source_credibility.category === 'trusted' ? 'rgba(16,185,129,0.15)' : 
                                        result.source_credibility.category === 'fact_checker' ? 'rgba(124,58,237,0.15)' : 'rgba(244,63,94,0.15)',
                            color: result.source_credibility.category === 'trusted' ? '#10b981' : 
                                   result.source_credibility.category === 'fact_checker' ? '#a855f7' : '#f43f5e',
                            border: `1px solid ${result.source_credibility.category === 'trusted' ? 'rgba(16,185,129,0.3)' : 
                                                 result.source_credibility.category === 'fact_checker' ? 'rgba(124,58,237,0.3)' : 'rgba(244,63,94,0.3)'}`
                          }}>
                            {result.source_credibility.category.replace('_', ' ')}
                          </span>
                        </div>
                        {result.source_credibility.credibility_score > 0 && (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                              <span style={{ color: '#8888aa' }}>Credibility Score</span>
                              <span style={{ color: '#f0f0ff', fontWeight: 600 }}>{result.source_credibility.credibility_score}/100</span>
                            </div>
                            <ConfidenceBar value={result.source_credibility.credibility_score / 100} color={
                              result.source_credibility.credibility_score >= 80 ? 'linear-gradient(90deg,#10b981,#34d399)' :
                              result.source_credibility.credibility_score >= 50 ? 'linear-gradient(90deg,#eab308,#facc15)' : 'linear-gradient(90deg,#f43f5e,#fb7185)'
                            } />
                          </div>
                        )}
                        {result.source_credibility.notes && (
                          <p style={{ fontSize: 12, color: '#8888aa', margin: 0, fontStyle: 'italic', lineHeight: 1.5 }}>
                            Note: {result.source_credibility.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Fact Verification matches */}
                  <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: 12, color: '#55556a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14 }}>Fact Verification Matches</p>
                    {result.fact_check_results && result.fact_check_results.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {result.fact_check_results.map((fc, idx) => (
                          <div key={idx} style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: 12,
                            padding: 14,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                              <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500, lineHeight: 1.4 }}>
                                "{fc.claim}"
                              </span>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                background: fc.verdict === 'real' ? 'rgba(16,185,129,0.15)' : 
                                            fc.verdict === 'fake' ? 'rgba(244,63,94,0.15)' : 'rgba(234,179,8,0.15)',
                                color: fc.verdict === 'real' ? '#10b981' : 
                                       fc.verdict === 'fake' ? '#f43f5e' : '#eab308',
                                border: `1px solid ${fc.verdict === 'real' ? 'rgba(16,185,129,0.3)' : 
                                                     fc.verdict === 'fake' ? 'rgba(244,63,94,0.3)' : 'rgba(234,179,8,0.3)'}`,
                                flexShrink: 0
                              }}>
                                {fc.verdict.replace('_', ' ')}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#8888aa', marginTop: 4 }}>
                              <span>Checked by: <a href={fc.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#a855f7', textDecoration: 'none', fontWeight: 600 }}>{fc.source_name} ↗</a></span>
                              <span>Match: {Math.round(fc.similarity_score * 100)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: '#8888aa', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                        ℹ No direct verified fact-checks found matching this content.
                      </div>
                    )}
                  </div>

                  {/* Model info */}
                  <div style={{ padding: '16px 28px', display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    {[
                      ['Model', result.model_version.model_name],
                      ['Algorithm', result.model_version.algorithm],
                      ['Processing', `${result.processing_time_ms} ms`],
                      ['ID', `#${result.prediction_id}`],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div style={{ fontSize: 11, color: '#55556a', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{k}</div>
                        <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════ HISTORY TAB ════════ */}
        {tab === 'history' && (
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1px', marginBottom: 8, color: '#f0f0ff' }}>
              Prediction History
            </h1>
            <p style={{ color: '#8888aa', marginBottom: 32 }}>All past news analysis submissions</p>

            {historyLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#55556a' }}>
                <div style={{ width: 32, height: 32, border: '3px solid rgba(124,58,237,0.2)', borderTop: '3px solid #7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
                Loading history…
              </div>
            ) : history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#55556a' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#8888aa' }}>No history yet</div>
                <div style={{ fontSize: 14 }}>Analyze some news articles to see results here.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {history.map(item => (
                  <div key={item.prediction_id} style={{
                    padding: '18px 22px', borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.07)',
                    background: 'rgba(255,255,255,0.02)',
                    display: 'grid', gridTemplateColumns: '1fr auto',
                    gap: 16, alignItems: 'center',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                    onClick={() => loadPredictionDetail(item.prediction_id)}
                    onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.3)' }}
                    onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)' }}
                  >
                    <div>
                      <p style={{
                        fontSize: 14, color: '#d1d5db', marginBottom: 6,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                      }}>
                        {item.content}
                      </p>
                      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#55556a' }}>
                        <span>{formatTime(item.submitted_at)}</span>
                        <span>•</span>
                        <span>{item.source_type}</span>
                        <span>•</span>
                        <span>#{item.prediction_id}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <span style={{
                        padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700,
                        background: item.label === 'fake' ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.15)',
                        color: item.label === 'fake' ? '#f43f5e' : '#10b981',
                        border: `1px solid ${item.label === 'fake' ? 'rgba(244,63,94,0.3)' : 'rgba(16,185,129,0.3)'}`,
                        textTransform: 'uppercase', letterSpacing: '0.5px'
                      }}>
                        {item.label}
                      </span>
                      <span style={{ fontSize: 12, color: '#55556a' }}>
                        {Math.round(item.confidence_score * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════ REPORTS TAB ════════ */}
        {tab === 'reports' && (
          <div style={{ display: 'grid', gridTemplateColumns: viewingReport ? '320px 1fr' : '1fr', gap: 24, animation: 'slideIn 0.3s ease-out' }}>
            {/* Left: Reports list */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(30px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: 24,
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f0f0ff', margin: 0 }}>System Reports</h2>
                <button
                  onClick={() => setShowGenerateReportModal(true)}
                  style={{
                    background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(124,58,237,0.3)',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
                  onMouseOut={e => e.currentTarget.style.opacity = '1'}
                >
                  Generate New
                </button>
              </div>

              {reportsLoading ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#55556a' }}>
                  <div style={{ width: 20, height: 20, border: '2px solid rgba(124,58,237,0.2)', borderTop: '2px solid #7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 10px' }} />
                  Loading...
                </div>
              ) : reports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#55556a' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#8888aa' }}>No reports yet</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Generate a new system summary report.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '60vh', overflowY: 'auto' }}>
                  {reports.map(rep => (
                    <button
                      key={rep.id}
                      onClick={() => viewReportContent(rep)}
                      style={{
                        textAlign: 'left',
                        padding: '14px',
                        borderRadius: 12,
                        border: '1px solid',
                        borderColor: viewingReport?.id === rep.id ? '#7c3aed' : 'rgba(255,255,255,0.06)',
                        background: viewingReport?.id === rep.id ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.01)',
                        color: '#f0f0ff',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        width: '100%'
                      }}
                      onMouseOver={e => { if (viewingReport?.id !== rep.id) e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)' }}
                      onMouseOut={e => { if (viewingReport?.id !== rep.id) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <IconFile />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rep.title}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#8888aa', marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ textTransform: 'capitalize' }}>{rep.report_type.replace('_', ' ')}</span>
                        <span>{formatTime(rep.generated_at)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Selected report content */}
            {viewingReport && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(30px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                animation: 'slideIn 0.3s ease-out'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16, marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f0f0ff', margin: 0 }}>{viewingReport.title}</h2>
                    <p style={{ fontSize: 12, color: '#8888aa', margin: '4px 0 0' }}>Type: {viewingReport.report_type} | Saved to: {viewingReport.file_path}</p>
                  </div>
                  <button
                    onClick={() => { setViewingReport(null); setActiveReportContent(null) }}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      padding: '6px 12px',
                      color: '#8888aa',
                      fontSize: 12,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff' }}
                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#8888aa' }}
                  >
                    Close
                  </button>
                </div>

                {activeReportContent === null ? (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: '#55556a' }}>
                    <div style={{ width: 24, height: 24, border: '2px solid rgba(124,58,237,0.2)', borderTop: '2px solid #7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
                    Reading report file content...
                  </div>
                ) : (
                  <pre style={{
                    fontFamily: 'monospace',
                    fontSize: 13,
                    color: '#9ca3af',
                    background: 'rgba(0, 0, 0, 0.2)',
                    padding: 20,
                    borderRadius: 12,
                    overflow: 'auto',
                    margin: 0,
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    border: '1px solid rgba(255,255,255,0.04)',
                    maxHeight: '60vh'
                  }}>
                    {activeReportContent}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* ════════ DASHBOARD TAB ════════ */}
        {tab === 'dashboard' && (
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1px', marginBottom: 8, color: '#f0f0ff' }}>
              Admin Dashboard
            </h1>
            <p style={{ color: '#8888aa', marginBottom: 32 }}>System overview and analytics</p>

            {analyticsLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#55556a' }}>
                <div style={{ width: 32, height: 32, border: '3px solid rgba(124,58,237,0.2)', borderTop: '3px solid #7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
                Loading…
              </div>
            ) : analytics && (
              <>
                {/* Stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                  {[
                    { label: 'Total Users', value: analytics.total_users, color: '#7c3aed', emoji: '👥' },
                    { label: 'Total Submissions', value: analytics.total_submissions, color: '#06b6d4', emoji: '📨' },
                    { label: 'Model Accuracy', value: `${analytics.accuracy_percentage}%`, color: '#10b981', emoji: '🎯' },
                    { label: 'Fake Detected', value: analytics.distribution.fake, color: '#f43f5e', emoji: '⚠️' },
                    { label: 'Real Verified', value: analytics.distribution.real, color: '#10b981', emoji: '✅' },
                  ].map(card => (
                    <div key={card.label} style={{
                      padding: '22px', borderRadius: 16,
                      border: '1px solid rgba(255,255,255,0.07)',
                      background: 'rgba(255,255,255,0.02)',
                    }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>{card.emoji}</div>
                      <div style={{ fontSize: 30, fontWeight: 800, color: card.color, letterSpacing: '-1px' }}>{card.value}</div>
                      <div style={{ fontSize: 13, color: '#8888aa', marginTop: 4 }}>{card.label}</div>
                    </div>
                  ))}
                </div>

                {/* Distribution bar */}
                <div style={{ padding: '24px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', marginBottom: 24 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f0f0ff', marginBottom: 16 }}>Prediction Distribution</h2>
                  <div style={{ display: 'flex', gap: 3, height: 20, borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
                    {analytics.distribution.fake + analytics.distribution.real > 0 ? (
                      <>
                        <div style={{ flex: analytics.distribution.fake, background: 'linear-gradient(90deg,#f43f5e,#fb7185)' }} />
                        <div style={{ flex: analytics.distribution.real, background: 'linear-gradient(90deg,#10b981,#34d399)' }} />
                      </>
                    ) : (
                      <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)' }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: '#f43f5e' }} />
                      <span style={{ color: '#8888aa' }}>Fake: <strong style={{ color: '#f43f5e' }}>{analytics.distribution.fake}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: '#10b981' }} />
                      <span style={{ color: '#8888aa' }}>Real: <strong style={{ color: '#10b981' }}>{analytics.distribution.real}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Model version control */}
                <div style={{
                  padding: '24px', borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.07)',
                  background: 'rgba(255,255,255,0.02)',
                  marginBottom: 24
                }}>
                  <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f0f0ff', marginBottom: 16 }}>Model Version Control</h2>
                  
                  {modelsLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#55556a' }}>Loading model versions...</div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#8888aa' }}>
                            <th style={{ padding: '10px' }}>Model Name</th>
                            <th style={{ padding: '10px' }}>Algorithm</th>
                            <th style={{ padding: '10px' }}>Accuracy</th>
                            <th style={{ padding: '10px' }}>F1 Score</th>
                            <th style={{ padding: '10px' }}>Status</th>
                            <th style={{ padding: '10px', textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {models.map(m => (
                            <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#9ca3af' }}>
                              <td style={{ padding: '12px 10px', fontWeight: 600, color: '#f0f0ff' }}>
                                {m.model_name}
                                <div style={{ fontSize: 11, color: '#55556a', fontWeight: 400, marginTop: 2 }}>Trained: {formatTime(m.trained_at)}</div>
                              </td>
                              <td style={{ padding: '12px 10px' }}>{m.algorithm}</td>
                              <td style={{ padding: '12px 10px' }}>{m.accuracy !== null ? `${Math.round(m.accuracy * 1000) / 10}%` : 'N/A'}</td>
                              <td style={{ padding: '12px 10px' }}>{m.f1_score !== null ? `${Math.round(m.f1_score * 1000) / 10}%` : 'N/A'}</td>
                              <td style={{ padding: '12px 10px' }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  background: m.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                                  color: m.is_active ? '#10b981' : '#8888aa',
                                  border: `1px solid ${m.is_active ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`
                                }}>
                                  {m.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                                {!m.is_active && (
                                  <button
                                    onClick={() => activateModel(m.id)}
                                    disabled={activatingModelId !== null}
                                    style={{
                                      background: 'rgba(124,58,237,0.15)',
                                      border: '1px solid rgba(124,58,237,0.3)',
                                      borderRadius: 6,
                                      padding: '4px 10px',
                                      color: '#c084fc',
                                      fontSize: 11,
                                      cursor: activatingModelId !== null ? 'not-allowed' : 'pointer',
                                      transition: 'all 0.2s'
                                    }}
                                    onMouseOver={e => { if (activatingModelId === null) { e.currentTarget.style.background = 'rgba(124,58,237,0.3)'; e.currentTarget.style.color = '#fff' } }}
                                    onMouseOut={e => { if (activatingModelId === null) { e.currentTarget.style.background = 'rgba(124,58,237,0.15)'; e.currentTarget.style.color = '#c084fc' } }}
                                  >
                                    {activatingModelId === m.id ? 'Activating...' : 'Activate'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Trending News */}
                <div style={{
                  padding: '24px', borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.07)',
                  background: 'rgba(255,255,255,0.02)',
                  marginBottom: 24
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                      <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f0f0ff', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                        <span style={{ fontSize: 18 }}>🔥</span> Trending & Viral News Activity
                      </h2>
                      <p style={{ fontSize: 12, color: '#8888aa', marginTop: 4, marginBottom: 0 }}>
                        Live, high-priority submitted claims being validated on the platform
                      </p>
                    </div>
                    {trendingLoading && (
                      <div style={{ fontSize: 12, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 12, height: 12, border: '2px solid rgba(99,102,241,0.2)', borderTop: '2px solid #6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                        Updating...
                      </div>
                    )}
                  </div>

                  {trendingLoading && trendingNews.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 0', color: '#55556a' }}>Loading trending news...</div>
                  ) : trendingNews.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 0', color: '#55556a' }}>No trending news activity detected.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                      {trendingNews.map(item => (
                        <div
                          key={item.id}
                          onClick={() => loadPredictionDetail(item.id)}
                          style={{
                            padding: '16px',
                            borderRadius: 12,
                            background: 'rgba(255, 255, 255, 0.01)',
                            border: '1px solid rgba(255,255,255,0.04)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease-in-out',
                            position: 'relative',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                          }}
                          onMouseOver={e => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseOut={e => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                            e.currentTarget.style.transform = 'none';
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                background: item.label === 'fake' ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.15)',
                                color: item.label === 'fake' ? '#f43f5e' : '#10b981',
                                border: `1px solid ${item.label === 'fake' ? 'rgba(244,63,94,0.3)' : 'rgba(16,185,129,0.3)'}`
                              }}>
                                {item.label}
                              </span>
                              <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}>
                                {Math.round(item.confidence_score * 100)}% Match
                              </span>
                            </div>
                            <p style={{
                              fontSize: 13,
                              color: '#d1d5db',
                              lineHeight: 1.5,
                              marginBottom: 16,
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              textAlign: 'left'
                            }}>
                              {item.content}
                            </p>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#55556a', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: 10 }}>
                            <span>Submitted: {formatTime(item.submitted_at)}</span>
                            <span style={{ color: '#8888aa', display: 'flex', alignItems: 'center', gap: 4 }}>
                              Analyze Details <span style={{ fontSize: 10 }}>→</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '20px 24px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', fontSize: 14, color: '#8888aa' }}>
                  <strong style={{ color: '#f0f0ff' }}>Active Model ID:</strong> #{analytics.active_model_id} &nbsp;|&nbsp;
                  <strong style={{ color: '#f0f0ff' }}>Accuracy:</strong> {analytics.accuracy_percentage}%
                  <br /><br />
                  <span style={{ color: '#55556a', fontSize: 13 }}>
                    📝 This dashboard shows live data from the database. You can activate different trained model versions directly using the table above.
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* ── Generate Report Modal ── */}
      {showGenerateReportModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 5, 10, 0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, animation: 'fadeIn 0.2s ease-out'
        }}>
          <form onSubmit={handleGenerateReport} style={{
            background: 'rgba(20, 20, 30, 0.95)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            padding: 32,
            width: '100%', maxWidth: 440,
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column', gap: 16
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f0f0ff', margin: 0 }}>Generate System Report</h2>
            <p style={{ fontSize: 13, color: '#8888aa', margin: 0 }}>Create a snapshot report of prediction statistics and metrics.</p>
            
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#8888aa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Report Title</label>
              <input
                type="text"
                required
                value={reportTitleInput}
                onChange={e => setReportTitleInput(e.target.value)}
                placeholder="e.g. System Audit June 2026"
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
                  color: '#f0f0ff', fontSize: 14, outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#8888aa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Report Type</label>
              <select
                value={reportTypeInput}
                onChange={e => setReportTypeInput(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(20,20,30,0.95)',
                  color: '#f0f0ff', fontSize: 14, outline: 'none', boxSizing: 'border-box'
                }}
              >
                <option value="prediction_summary">Prediction Summary</option>
                <option value="usage">Usage Statistics</option>
                <option value="model_performance">Model Performance</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setShowGenerateReportModal(false)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
                  color: '#8888aa', fontSize: 14, cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={generatingReport}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white',
                  fontSize: 14, fontWeight: 600, cursor: generatingReport ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(124,58,237,0.3)'
                }}
              >
                {generatingReport ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Prediction Details Modal ── */}
      {showDetailModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 5, 10, 0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 24, animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'rgba(20, 20, 30, 0.95)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 24,
            padding: 32,
            width: '100%', maxWidth: 640,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {predictionDetailLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#55556a' }}>
                <div style={{ width: 32, height: 32, border: '3px solid rgba(124,58,237,0.2)', borderTop: '3px solid #7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
                Loading prediction details...
              </div>
            ) : selectedPrediction && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16 }}>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f0f0ff', margin: 0 }}>Prediction Analysis #{selectedPrediction.prediction_id}</h2>
                    <p style={{ fontSize: 12, color: '#8888aa', margin: '4px 0 0' }}>
                      Analyzed at: {formatTime(selectedPrediction.predicted_at)} | Type: <span style={{ textTransform: 'uppercase' }}>{selectedPrediction.source_type}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    style={{
                      background: 'none', border: 'none', color: '#8888aa',
                      fontSize: 20, cursor: 'pointer', padding: 0
                    }}
                  >
                    &times;
                  </button>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#55556a', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Submitted content</label>
                  <div style={{
                    maxHeight: '140px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)',
                    padding: 12, borderRadius: 10, fontSize: 13, color: '#d1d5db', lineHeight: 1.6
                  }}>
                    <HighlightedText text={selectedPrediction.input_preview} importances={selectedPrediction.word_importances} />
                  </div>
                  {selectedPrediction.source_url && (
                    <div style={{ fontSize: 12, color: '#8888aa', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IconLink /> URL: <a href={selectedPrediction.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#a855f7', textDecoration: 'none' }}>{selectedPrediction.source_url}</a>
                    </div>
                  )}
                </div>

                <div style={{
                  borderRadius: 16, border: `1px solid ${selectedPrediction.label === 'fake' ? 'rgba(244,63,94,0.3)' : 'rgba(16,185,129,0.3)'}`,
                  background: selectedPrediction.label === 'fake' ? 'rgba(244,63,94,0.04)' : 'rgba(16,185,129,0.04)',
                  padding: 20, display: 'grid', gridTemplateColumns: '120px 1fr', gap: 20, alignItems: 'center'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: 16, fontWeight: 800,
                      color: selectedPrediction.label === 'fake' ? '#f43f5e' : '#10b981',
                      textTransform: 'uppercase', letterSpacing: '0.5px'
                    }}>
                      {selectedPrediction.label === 'fake' ? 'Fake News' : 'Likely Real'}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#f0f0ff', marginTop: 4 }}>
                      {Math.round(selectedPrediction.confidence_score * 100)}%
                    </div>
                    <div style={{ fontSize: 10, color: '#8888aa', marginTop: 2 }}>Confidence</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                        <span style={{ color: '#f43f5e' }}>Fake Probability</span>
                        <span style={{ color: '#f0f0ff' }}>{Math.round((selectedPrediction.fake_probability ?? 0) * 100)}%</span>
                      </div>
                      <ConfidenceBar value={selectedPrediction.fake_probability ?? 0} color="#f43f5e" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                        <span style={{ color: '#10b981' }}>Real Probability</span>
                        <span style={{ color: '#f0f0ff' }}>{Math.round((selectedPrediction.real_probability ?? 0) * 100)}%</span>
                      </div>
                      <ConfidenceBar value={selectedPrediction.real_probability ?? 0} color="#10b981" />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#55556a', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Model Analysis Explanation</label>
                  <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.6, margin: 0 }}>
                    {selectedPrediction.explanation}
                  </p>
                </div>

                {/* Source Credibility */}
                {selectedPrediction.source_credibility && selectedPrediction.source_credibility.category !== 'not_applicable' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#55556a', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Source Credibility Assessment</label>
                    <div style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      padding: 16,
                      borderRadius: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#f0f0ff' }}>
                            {selectedPrediction.source_credibility.source_name}
                          </span>
                          <span style={{ fontSize: 11, color: '#8888aa', display: 'block', marginTop: 2 }}>
                            Domain: {selectedPrediction.source_credibility.domain}
                          </span>
                        </div>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: selectedPrediction.source_credibility.category === 'trusted' ? 'rgba(16,185,129,0.15)' : 
                                      selectedPrediction.source_credibility.category === 'fact_checker' ? 'rgba(124,58,237,0.15)' : 'rgba(244,63,94,0.15)',
                          color: selectedPrediction.source_credibility.category === 'trusted' ? '#10b981' : 
                                 selectedPrediction.source_credibility.category === 'fact_checker' ? '#a855f7' : '#f43f5e',
                          border: `1px solid ${selectedPrediction.source_credibility.category === 'trusted' ? 'rgba(16,185,129,0.3)' : 
                                               selectedPrediction.source_credibility.category === 'fact_checker' ? 'rgba(124,58,237,0.3)' : 'rgba(244,63,94,0.3)'}`
                        }}>
                          {selectedPrediction.source_credibility.category.replace('_', ' ')}
                        </span>
                      </div>
                      {selectedPrediction.source_credibility.credibility_score > 0 && (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                            <span style={{ color: '#8888aa' }}>Credibility Score</span>
                            <span style={{ color: '#f0f0ff', fontWeight: 600 }}>{selectedPrediction.source_credibility.credibility_score}/100</span>
                          </div>
                          <ConfidenceBar value={selectedPrediction.source_credibility.credibility_score / 100} color={
                            selectedPrediction.source_credibility.credibility_score >= 80 ? '#10b981' :
                            selectedPrediction.source_credibility.credibility_score >= 50 ? '#eab308' : '#f43f5e'
                          } />
                        </div>
                      )}
                      {selectedPrediction.source_credibility.notes && (
                        <p style={{ fontSize: 11, color: '#8888aa', margin: 0, fontStyle: 'italic', lineHeight: 1.4 }}>
                          Note: {selectedPrediction.source_credibility.notes}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Fact Verification matches */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#55556a', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Fact Verification Matches</label>
                  {selectedPrediction.fact_check_results && selectedPrediction.fact_check_results.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {selectedPrediction.fact_check_results.map((fc: any, idx: number) => (
                        <div key={idx} style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: 12,
                          padding: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                            <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500, lineHeight: 1.4 }}>
                              "{fc.claim}"
                            </span>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 9,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: fc.verdict === 'real' ? 'rgba(16,185,129,0.15)' : 
                                          fc.verdict === 'fake' ? 'rgba(244,63,94,0.15)' : 'rgba(234,179,8,0.15)',
                              color: fc.verdict === 'real' ? '#10b981' : 
                                     fc.verdict === 'fake' ? '#f43f5e' : '#eab308',
                              border: `1px solid ${fc.verdict === 'real' ? 'rgba(16,185,129,0.3)' : 
                                                   fc.verdict === 'fake' ? 'rgba(244,63,94,0.3)' : 'rgba(234,179,8,0.3)'}`,
                              flexShrink: 0
                            }}>
                              {fc.verdict.replace('_', ' ')}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#8888aa', marginTop: 2 }}>
                            <span>Checked by: <a href={fc.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#a855f7', textDecoration: 'none', fontWeight: 600 }}>{fc.source_name} ↗</a></span>
                            <span>Match: {Math.round(fc.similarity_score * 100)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: '#8888aa', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      ℹ No direct verified fact-checks found matching this content.
                    </div>
                  )}
                </div>

                {/* Similar Past Analyses */}
                {selectedPrediction.related_predictions && selectedPrediction.related_predictions.length > 0 && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#55556a', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Similar Past Analyses</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {selectedPrediction.related_predictions.map((rel: any, idx: number) => (
                        <div key={idx} 
                          onClick={() => loadPredictionDetail(rel.prediction_id)}
                          style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: 12,
                          padding: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.3)' }}
                        onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                            <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500, lineHeight: 1.4 }}>
                              {rel.content_preview}
                            </span>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 9,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: rel.label === 'fake' ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.15)',
                              color: rel.label === 'fake' ? '#f43f5e' : '#10b981',
                              border: `1px solid ${rel.label === 'fake' ? 'rgba(244,63,94,0.3)' : 'rgba(16,185,129,0.3)'}`,
                              flexShrink: 0
                            }}>
                              {rel.label}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#8888aa', marginTop: 2 }}>
                            <span>Prediction #{rel.prediction_id}</span>
                            <span>Content Match: {Math.round(rel.similarity_score * 100)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{
                  borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16,
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, fontSize: 11, color: '#8888aa'
                }}>
                  <div>
                    <span style={{ display: 'block', color: '#55556a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Model Version</span>
                    <strong style={{ color: '#9ca3af', display: 'block', marginTop: 2 }}>{selectedPrediction.model_version.model_name}</strong>
                  </div>
                  <div>
                    <span style={{ display: 'block', color: '#55556a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Algorithm</span>
                    <strong style={{ color: '#9ca3af', display: 'block', marginTop: 2 }}>{selectedPrediction.model_version.algorithm}</strong>
                  </div>
                  <div>
                    <span style={{ display: 'block', color: '#55556a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Processing time</span>
                    <strong style={{ color: '#9ca3af', display: 'block', marginTop: 2 }}>{selectedPrediction.processing_time_ms} ms</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    style={{
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8, padding: '8px 20px', color: '#f0f0ff', fontSize: 13, cursor: 'pointer'
                    }}
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '20px 24px', textAlign: 'center',
        fontSize: 13, color: '#55556a'
      }}>
        TruthGuard · AI-Based Fake News Detection · Final Year Project &nbsp;|&nbsp; Backend: localhost:8000 · Frontend: localhost:5173
      </footer>

      {/* ── CSS Animations ── */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
