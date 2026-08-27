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

interface ViralityRiskItem {
  virality_risk_level: 'high' | 'medium' | 'low'
  virality_score: number
  risk_factors: string[]
  recommendation: string
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
  virality_risk?: ViralityRiskItem | null
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
  source_url?: string | null
  image_url?: string | null
  language?: string | null
  submitted_at: string
}

type Tab = 'analyze' | 'trending' | 'history' | 'reports' | 'dashboard'
type InputType = 'text' | 'social' | 'url' | 'image'

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
    <div style={{ background: '#e2e8f0', borderRadius: 99, height: 8, overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: 99, background: color,
        width: `${width}%`, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)'
      }} />
    </div>
  )
}

// ─── Icons (inline SVG) ──────────────────────────────────────────────────────
const IconSearch = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
const IconFlame = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
const IconHistory = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
const IconDash = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
const IconAlert = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
const IconCheck = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
const IconLink = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
const IconText = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 6.1H3"/><path d="M21 12.1H3"/><path d="M15.1 18H3"/></svg>
const IconShare = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
const IconImage = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
const IconReports = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
const IconFile = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>

// ─── Trending News Component for User UI ────────────────────────────────────
function TrendingNewsFeed({
  items,
  loading,
  syncing,
  syncMessage,
  onRefresh,
  onSyncLive,
  onInspect,
  onQuickTest,
  searchQuery,
  setSearchQuery,
  filter,
  setFilter
}: {
  items: TrendingItem[]
  loading: boolean
  syncing: boolean
  syncMessage: string | null
  onRefresh: () => void
  onSyncLive: () => void
  onInspect: (id: number) => void
  onQuickTest: (content: string) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  filter: 'all' | 'fake' | 'real'
  setFilter: (f: 'all' | 'fake' | 'real') => void
}) {
  const filtered = items.filter(item => {
    const matchesFilter = filter === 'all' || item.label === filter
    const matchesSearch = !searchQuery.trim() || item.content.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const fakeCount = items.filter(i => i.label === 'fake').length
  const realCount = items.filter(i => i.label === 'real').length

  function getDomain(url?: string | null) {
    if (!url) return null
    try {
      const u = new URL(url)
      return u.hostname.replace(/^www\./, '')
    } catch {
      return null
    }
  }

  return (
    <div style={{
      marginTop: 48,
      padding: '32px 28px',
      borderRadius: 24,
      background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
      border: '1px solid #e2e8f0',
      boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: 'linear-gradient(135deg, #f97316, #ef4444)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(239,68,68,0.35)',
              color: 'white'
            }}>
              <IconFlame />
            </div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
                🔥 Live Breaking News & AI Verification Feed
              </h2>
            </div>
            <span style={{
              padding: '4px 10px',
              borderRadius: 99,
              fontSize: 11,
              fontWeight: 700,
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fee2e2',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block', boxShadow: '0 0 6px #ef4444' }} />
              LIVE REAL-TIME FEEDS
            </span>
          </div>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 6, marginBottom: 0 }}>
            Real-time breaking stories fetched from Ada Derana, BBC News, Al Jazeera & social platforms, continuously verified by our ML model.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={onSyncLive}
            disabled={syncing}
            style={{
              background: 'linear-gradient(135deg, #059669, #10b981)',
              border: 'none',
              borderRadius: 10,
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: 700,
              color: 'white',
              cursor: syncing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
              transition: 'opacity 0.2s'
            }}
            onMouseOver={e => { if (!syncing) e.currentTarget.style.opacity = '0.9' }}
            onMouseOut={e => { if (!syncing) e.currentTarget.style.opacity = '1' }}
          >
            <span>{syncing ? '⏳' : '📡'}</span>
            {syncing ? 'Fetching Live News Feeds...' : 'Fetch Live Real News'}
          </button>

          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              padding: '9px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: '#334155',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => { if (!loading) { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#4338ca' } }}
            onMouseOut={e => { if (!loading) { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#334155' } }}
          >
            <span>🔄</span>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncMessage && (
        <div style={{
          padding: '12px 18px',
          borderRadius: 12,
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <span>✨</span> {syncMessage}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '16px',
        background: '#ffffff',
        borderRadius: 16,
        border: '1px solid #e2e8f0',
        marginBottom: 24
      }}>
        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {([
            { key: 'all', label: `All Real-Time Claims (${items.length})` },
            { key: 'fake', label: `Flagged Fake (${fakeCount})` },
            { key: 'real', label: `Verified Real (${realCount})` },
          ] as const).map(tabItem => (
            <button
              key={tabItem.key}
              onClick={() => setFilter(tabItem.key as any)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px solid',
                borderColor: filter === tabItem.key ? (tabItem.key === 'fake' ? '#e11d48' : tabItem.key === 'real' ? '#059669' : '#6366f1') : '#e2e8f0',
                background: filter === tabItem.key ? (tabItem.key === 'fake' ? '#fff1f2' : tabItem.key === 'real' ? '#ecfdf5' : '#e0e7ff') : '#f8fafc',
                color: filter === tabItem.key ? (tabItem.key === 'fake' ? '#e11d48' : tabItem.key === 'real' ? '#059669' : '#4338ca') : '#64748b',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {tabItem.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', minWidth: '240px', flex: '1', maxWidth: '320px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search live news / keywords..."
            style={{
              width: '100%',
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              outline: 'none',
              background: '#f8fafc',
              boxSizing: 'border-box'
            }}
            onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.background = '#ffffff' }}
            onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.background = '#f8fafc' }}
          />
        </div>
      </div>

      {/* Grid of Trending Cards */}
      {(loading || syncing) && items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 0', color: '#64748b' }}>
          <div style={{ width: 28, height: 28, border: '3px solid #c7d2fe', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
          Connecting to live news feeds and analyzing with AI...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', background: '#ffffff', borderRadius: 16, border: '1px dashed #cbd5e1' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📡</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#334155' }}>No news items match your search filter</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Click "Fetch Live Real News" above to download the latest breaking stories!</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
          {filtered.map(item => {
            const domain = getDomain(item.source_url)
            return (
              <div
                key={item.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 16,
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                  transition: 'all 0.25s ease',
                  position: 'relative'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.borderColor = item.label === 'fake' ? '#f43f5e' : '#10b981'
                  e.currentTarget.style.boxShadow = item.label === 'fake' ? '0 12px 24px -6px rgba(225,29,72,0.12)' : '0 12px 24px -6px rgba(5,150,105,0.12)'
                  e.currentTarget.style.transform = 'translateY(-3px)'
                }}
                onMouseOut={e => {
                  e.currentTarget.style.borderColor = '#e2e8f0'
                  e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.02)'
                  e.currentTarget.style.transform = 'none'
                }}
              >
                <div>
                  {/* Card Image Banner */}
                  <div style={{
                    width: '100%',
                    height: 160,
                    borderRadius: 12,
                    overflow: 'hidden',
                    position: 'relative',
                    marginBottom: 14,
                    background: '#f1f5f9'
                  }}>
                    <img
                      src={item.image_url || "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=600&auto=format&fit=crop&q=80"}
                      alt="News thumbnail"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                        transition: 'transform 0.4s ease'
                      }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=600&auto=format&fit=crop&q=80"
                      }}
                    />
                    {/* Verdict overlay pill */}
                    <div style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      background: item.label === 'fake' ? 'rgba(225,29,72,0.92)' : 'rgba(5,150,105,0.92)',
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      backdropFilter: 'blur(4px)'
                    }}>
                      {item.label === 'fake' ? '⚠️ FAKE NEWS' : '✓ LIKELY REAL'}
                    </div>

                    {/* Confidence score overlay */}
                    <div style={{
                      position: 'absolute',
                      bottom: 10,
                      right: 10,
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      background: 'rgba(15,23,42,0.78)',
                      color: 'white',
                      backdropFilter: 'blur(4px)'
                    }}>
                      {Math.round(item.confidence_score * 100)}% Confidence
                    </div>
                  </div>

                  {/* News Claim Content */}
                  <p style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#1e293b',
                    lineHeight: 1.55,
                    marginBottom: 14,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    "{item.content}"
                  </p>

                  {/* Source metadata badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    {domain ? (
                      <span style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: '#f1f5f9',
                        color: '#475569',
                        fontWeight: 600,
                        border: '1px solid #e2e8f0',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        🌐 {domain}
                      </span>
                    ) : (
                      <span style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: '#f8fafc',
                        color: '#64748b',
                        fontWeight: 500
                      }}>
                        💬 Monitored Claim
                      </span>
                    )}

                    {item.language === 'si' && (
                      <span style={{
                        fontSize: 11,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: '#fef3c7',
                        color: '#92400e',
                        fontWeight: 600
                      }}>
                        🇱🇰 Sinhala
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer & Action Buttons */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#64748b', marginBottom: 12 }}>
                    <span>Published: {formatTime(item.submitted_at)}</span>
                    {item.source_url && (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}
                        onClick={e => e.stopPropagation()}
                      >
                        Original Article ↗
                      </a>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button
                      onClick={() => onQuickTest(item.content)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        color: '#334155',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = '#e0e7ff'; e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#4338ca' }}
                      onMouseOut={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#334155' }}
                    >
                      ⚡ Test in AI
                    </button>

                    <button
                      onClick={() => onInspect(item.id)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: 'none',
                        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                        color: 'white',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
                        transition: 'opacity 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
                      onMouseOut={e => e.currentTarget.style.opacity = '1'}
                    >
                      Full Report →
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

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
          const color = imp.is_fake_indicator ? '#fff1f2' : '#ecfdf5';
          const border = imp.is_fake_indicator ? '1px solid #fecdd3' : '1px solid #a7f3d0';
          const textColor = imp.is_fake_indicator ? '#9f1239' : '#065f46';
          return (
            <span key={i} style={{
              background: color,
              border: border,
              color: textColor,
              padding: '2px 6px',
              borderRadius: 6,
              fontWeight: 600,
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
  
  // Trending news states (for User UI)
  const [trendingNews, setTrendingNews] = useState<TrendingItem[]>([])
  const [trendingLoading, setTrendingLoading] = useState(false)
  const [syncingLive, setSyncingLive] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [trendingSearch, setTrendingSearch] = useState('')
  const [trendingFilter, setTrendingFilter] = useState<'all' | 'fake' | 'real'>('all')

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
    if (tab === 'analyze' || tab === 'trending') loadTrendingNews()
    if (tab === 'history') loadHistory()
    if (tab === 'dashboard') {
      loadAnalytics()
      loadModels()
    }
    if (tab === 'reports') loadReports()
  }, [tab])

  useEffect(() => {
    loadTrendingNews()
  }, [])

  function handleTestTrending(claimText: string) {
    setInputType('text')
    setContent(claimText)
    setTab('analyze')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setTimeout(() => textRef.current?.focus(), 100)
  }

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

  async function syncLiveNews() {
    setSyncingLive(true)
    setSyncMessage(null)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${API}/predictions/trending/sync-live`, {
        method: 'POST',
        headers
      })
      if (res.ok) {
        const data = await res.json()
        setSyncMessage(`Successfully fetched & verified ${data.new_articles_synced} live breaking news articles!`)
        await loadTrendingNews()
        setTimeout(() => setSyncMessage(null), 5000)
      } else {
        setSyncMessage('Failed to sync live feeds. Showing current verified claims.')
        setTimeout(() => setSyncMessage(null), 4000)
      }
    } catch (e) {
      console.error(e)
      setSyncMessage('Connection error while fetching live feeds.')
      setTimeout(() => setSyncMessage(null), 4000)
    } finally {
      setSyncingLive(false)
    }
  }

  async function loadTrendingNews() {
    setTrendingLoading(true)
    try {
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${API}/predictions/trending`, { headers })
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
        background: 'linear-gradient(135deg, #0b0f19 0%, #1e1b4b 50%, #0f172a 100%)',
        padding: 24,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow Effects */}
        <div style={{
          position: 'absolute', width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)',
          top: '5%', left: '10%', zIndex: 0, pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(217,70,239,0.18) 0%, transparent 70%)',
          bottom: '5%', right: '10%', zIndex: 0, pointerEvents: 'none'
        }} />

        <div style={{
          width: '100%', maxWidth: 440,
          background: 'rgba(255, 255, 255, 0.96)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          borderRadius: 28,
          padding: '44px 36px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35), 0 0 40px rgba(99, 102, 241, 0.2)',
          zIndex: 1,
          position: 'relative',
          backdropFilter: 'blur(20px)'
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <div style={{
              width: 54, height: 54, borderRadius: 16,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.45)'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 26, color: '#0f172a', letterSpacing: '-0.6px', fontFamily: "'Outfit', sans-serif" }}>TruthGuard</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, fontWeight: 500 }}>AI Fake News Verification System</div>
            </div>
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 22, textAlign: 'center', fontFamily: "'Outfit', sans-serif" }}>
            {isRegisterMode ? 'Create your account' : 'Sign in to your account'}
          </h2>

          {authError && (
            <div style={{
              padding: '12px 16px', borderRadius: 12, marginBottom: 20,
              background: '#fff1f2', border: '1px solid #fecdd3',
              color: '#e11d48', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500
            }}>
              <IconAlert /> {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {isRegisterMode && (
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 600 }}>Full Name</label>
                <input
                  type="text"
                  required
                  value={authName}
                  onChange={e => setAuthName(e.target.value)}
                  placeholder="John Doe"
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 12,
                    border: '1px solid #cbd5e1', background: '#f8fafc',
                    color: '#0f172a', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                    fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 0.2s'
                  }}
                  onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)' }}
                  onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 600 }}>Email Address</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
                placeholder="name@example.com"
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 12,
                  border: '1px solid #cbd5e1', background: '#f8fafc',
                  color: '#0f172a', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 0.2s'
                }}
                onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)' }}
                onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 600 }}>Password</label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 12,
                  border: '1px solid #cbd5e1', background: '#f8fafc',
                  color: '#0f172a', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 0.2s'
                }}
                onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)' }}
                onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)', color: 'white',
                fontSize: 15, fontWeight: 700, cursor: authLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 6px 20px rgba(99,102,241,0.35)', marginTop: 8,
                transition: 'all 0.2s', fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}
              onMouseOver={e => { if (!authLoading) e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseOut={e => { if (!authLoading) e.currentTarget.style.transform = 'none' }}
            >
              {authLoading ? 'Please wait...' : isRegisterMode ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
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
                background: 'none', border: 'none', color: '#6366f1',
                fontWeight: 700, cursor: 'pointer', padding: 0
              }}
            >
              {isRegisterMode ? 'Sign In' : 'Sign Up'}
            </button>
          </div>

          <div style={{ marginTop: 22, borderTop: '1px solid #e2e8f0', paddingTop: 16, fontSize: 12, color: '#64748b', textAlign: 'center', background: '#f8fafc', borderRadius: 14, padding: '14px 16px' }}>
            <span style={{ fontWeight: 700, color: '#334155' }}>💡 Quick Demo Login:</span>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
              <button
                type="button"
                onClick={() => { setAuthEmail('user@truthguard.com'); setAuthPassword('userpassword'); setIsRegisterMode(false); }}
                style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', fontSize: 11, fontWeight: 600, color: '#4338ca', cursor: 'pointer' }}
              >
                User Login
              </button>
              <button
                type="button"
                onClick={() => { setAuthEmail('admin@truthguard.com'); setAuthPassword('adminpassword'); setIsRegisterMode(false); }}
                style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', fontSize: 11, fontWeight: 600, color: '#e11d48', cursor: 'pointer' }}
              >
                Admin Login
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Render Authenticated Main App ──────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Background Decorative Mesh Glows */}
      <div className="floating-mesh" style={{ width: 500, height: 500, background: 'rgba(99, 102, 241, 0.08)', top: -100, left: -100 }} />
      <div className="floating-mesh" style={{ width: 400, height: 400, background: 'rgba(217, 70, 239, 0.06)', top: 200, right: -50 }} />

      {/* ── Header ── */}
      <header style={{
        borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
        background: 'rgba(255, 255, 255, 0.82)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 70 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setTab('analyze')}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 18px rgba(99, 102, 241, 0.35)',
              transition: 'transform 0.2s ease'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a', letterSpacing: '-0.4px', fontFamily: "'Outfit', sans-serif" }}>TruthGuard</div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, letterSpacing: '0.3px' }}>AI Misinformation Defense</div>
            </div>
          </div>

          {/* Nav tabs */}
          <nav style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 5, borderRadius: 14, border: '1px solid #e2e8f0' }}>
            {([
              { id: 'analyze', label: 'Analyze', icon: <IconSearch /> },
              { id: 'trending', label: 'Live Feed', icon: <IconFlame /> },
              { id: 'history', label: 'History', icon: <IconHistory /> },
              { id: 'reports', label: 'Reports', icon: <IconReports /> },
              ...(user?.role === 'admin' ? [{ id: 'dashboard', label: 'Admin Panel', icon: <IconDash /> }] : []),
            ] as const).map(t => (
              <button key={t.id} onClick={() => setTab(t.id as Tab)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif",
                background: tab === t.id ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent',
                color: tab === t.id ? '#ffffff' : '#64748b',
                transition: 'all 0.25s ease',
                boxShadow: tab === t.id ? '0 4px 14px rgba(99, 102, 241, 0.3)' : 'none',
              }}
              onMouseOver={e => { if (tab !== t.id) e.currentTarget.style.color = '#0f172a' }}
              onMouseOut={e => { if (tab !== t.id) e.currentTarget.style.color = '#64748b' }}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </nav>

          {/* Profile & Sign Out */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {user && (
              <div style={{
                fontSize: 13, color: '#0f172a', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#ffffff', border: '1px solid #e2e8f0',
                padding: '6px 12px', borderRadius: 10,
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
                <span>{user.full_name}</span>
                <span style={{
                  fontSize: 10, background: '#e0e7ff', border: '1px solid #c7d2fe',
                  padding: '2px 7px', borderRadius: 6, textTransform: 'uppercase',
                  fontWeight: 700, color: '#4338ca'
                }}>
                  {user.role}
                </span>
              </div>
            )}
            <button onClick={handleLogout} style={{
              background: '#ffffff', border: '1px solid #e2e8f0',
              padding: '7px 14px', borderRadius: 10, color: '#64748b', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
              transition: 'all 0.2s', boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}
              onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = '#e11d48'; (e.currentTarget as HTMLElement).style.background = '#fff1f2'; (e.currentTarget as HTMLElement).style.borderColor = '#fecdd3' }}
              onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = '#64748b'; (e.currentTarget as HTMLElement).style.background = '#ffffff'; (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main style={{ flex: 1, maxWidth: 1180, margin: '0 auto', width: '100%', padding: '40px 24px', position: 'relative', zIndex: 1 }}>

        {/* ════════ ANALYZE TAB ════════ */}
        {tab === 'analyze' && (
          <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap: 36, transition: 'all 0.4s' }}>

            {/* Left: Input */}
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 99, marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⚡ Dual-Engine NLP Verification</span>
              </div>
              <h1 style={{
                fontSize: 42, fontWeight: 800, letterSpacing: '-1.5px',
                background: 'linear-gradient(135deg, #0f172a 0%, #4338ca 50%, #db2777 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                marginBottom: 10, lineHeight: 1.15, fontFamily: "'Outfit', sans-serif"
              }}>
                Detect Fake News<br />with Intelligence
              </h1>
              <p style={{ color: '#64748b', fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>
                Paste article text, WhatsApp messages, or web links — our ML models verify claims across English and Sinhala (සිංහල) instantly.
              </p>

              {/* Input type toggle */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {(['text', 'social', 'url', 'image'] as const).map(t => (
                  <button key={t} onClick={() => { setInputType(t); setContent(''); setImageFile(null); setImagePreviewUrl(null) }} style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '9px 16px', borderRadius: 10, border: '1px solid',
                    borderColor: inputType === t ? '#6366f1' : '#e2e8f0',
                    background: inputType === t ? 'linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%)' : '#ffffff',
                    color: inputType === t ? '#4338ca' : '#64748b',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif",
                    transition: 'all 0.2s',
                    boxShadow: inputType === t ? '0 2px 8px rgba(99, 102, 241, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)'
                  }}>
                    {t === 'text' ? <IconText /> : t === 'social' ? <IconShare /> : t === 'url' ? <IconLink /> : <IconImage />}
                    {t === 'text' ? 'News Text' : t === 'social' ? 'Social / WhatsApp' : t === 'url' ? 'News URL' : 'Image Upload'}
                  </button>
                ))}
              </div>

              {/* Input field */}
              <div style={{ position: 'relative', marginBottom: 16 }}>
                {inputType === 'text' || inputType === 'social' ? (
                  <textarea
                    ref={textRef}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder={inputType === 'social' ? "Paste WhatsApp forward message, Facebook post, or viral social media rumor text here…" : "Paste your news article text here…"}
                    rows={10}
                    style={{
                      width: '100%', padding: '16px', borderRadius: 12,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a', fontSize: 15, lineHeight: 1.7,
                      fontFamily: 'Inter, sans-serif', resize: 'vertical',
                      outline: 'none', transition: 'all 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)' }}
                    onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none' }}
                  />
                ) : inputType === 'url' ? (
                  <input
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="https://example.com/news-article"
                    onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                    style={{
                      width: '100%', padding: '14px 16px', borderRadius: 12,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a', fontSize: 15,
                      fontFamily: 'Inter, sans-serif',
                      outline: 'none', boxSizing: 'border-box'
                    }}
                    onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)' }}
                    onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none' }}
                  />
                ) : (
                  <div style={{
                    width: '100%', padding: '40px', borderRadius: 12,
                    border: '2px dashed #cbd5e1',
                    background: '#ffffff',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.2s', boxSizing: 'border-box'
                  }}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#6366f1' }}
                  onDragLeave={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#cbd5e1' }}
                  onDrop={e => {
                    e.preventDefault()
                    e.currentTarget.style.borderColor = '#cbd5e1'
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
                        <div style={{ color: '#64748b', marginBottom: 12, transform: 'scale(1.5)' }}><IconImage /></div>
                        <div style={{ color: '#1e293b', fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Click or drag an image here</div>
                        <div style={{ color: '#64748b', fontSize: 13 }}>Supports JPG, PNG, WEBP</div>
                      </>
                    )}
                  </div>
                )}
                {inputType !== 'image' && (
                  <div style={{ position: 'absolute', bottom: 10, right: 12, fontSize: 12, color: '#94a3b8' }}>
                    {content.length} chars
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  padding: '12px 16px', borderRadius: 10, marginBottom: 16,
                  background: '#fff1f2', border: '1px solid #fecdd3',
                  color: '#e11d48', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10
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
                    background: loading || (inputType !== 'image' && !content.trim()) || (inputType === 'image' && !imageFile) ? '#c7d2fe' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    color: 'white', fontSize: 16, fontWeight: 600, fontFamily: 'Inter, sans-serif',
                    cursor: loading || (inputType !== 'image' && !content.trim()) || (inputType === 'image' && !imageFile) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: loading || (inputType !== 'image' && !content.trim()) || (inputType === 'image' && !imageFile) ? 'none' : '0 4px 16px rgba(99,102,241,0.35)',
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
                    border: '1px solid #cbd5e1',
                    background: '#ffffff', color: '#475569',
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
                  <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>Try an example:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      'SHOCKING: Secrets regarding miracle cures that corporations suppress are finally exposed!',
                      'Researchers at the university announced a new program to expand access to primary healthcare.',
                    ].map((ex, i) => (
                      <button key={i} onClick={() => { setContent(ex); setInputType('text') }} style={{
                        textAlign: 'left', padding: '10px 14px', borderRadius: 10,
                        border: '1px solid #e2e8f0',
                        background: '#ffffff', color: '#334155',
                        fontSize: 13, fontFamily: 'Inter, sans-serif',
                        cursor: 'pointer', transition: 'all 0.2s',
                        lineHeight: 1.5
                      }}
                        onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = '#818cf8'; (e.currentTarget as HTMLElement).style.color = '#0f172a' }}
                        onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.color = '#334155' }}
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
              <div style={{ animation: 'slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
                <div style={{
                  borderRadius: 24, overflow: 'hidden',
                  border: `1px solid ${result.label === 'fake' ? 'rgba(244, 63, 94, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                  background: result.label === 'fake' 
                    ? 'linear-gradient(180deg, #fff5f5 0%, #ffffff 100%)' 
                    : 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)',
                  boxShadow: result.label === 'fake' 
                    ? '0 20px 40px -10px rgba(225, 29, 72, 0.12), 0 0 0 1px rgba(244, 63, 94, 0.2)' 
                    : '0 20px 40px -10px rgba(5, 150, 105, 0.12), 0 0 0 1px rgba(16, 185, 129, 0.2)'
                }}>
                  {/* Header */}
                  <div style={{
                    padding: '30px 28px 26px',
                    borderBottom: `1px solid ${result.label === 'fake' ? '#fee2e2' : '#dcfce7'}`,
                    display: 'flex', alignItems: 'center', gap: 18,
                    background: result.label === 'fake' ? 'rgba(254, 226, 226, 0.4)' : 'rgba(220, 252, 231, 0.4)'
                  }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 16,
                      background: result.label === 'fake' ? 'linear-gradient(135deg, #e11d48, #f43f5e)' : 'linear-gradient(135deg, #059669, #10b981)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#ffffff',
                      boxShadow: result.label === 'fake' ? '0 8px 20px rgba(225, 29, 72, 0.35)' : '0 8px 20px rgba(5, 150, 105, 0.35)',
                      flexShrink: 0
                    }}>
                      {result.label === 'fake' ? <IconAlert /> : <IconCheck />}
                    </div>
                    <div>
                      <div style={{
                        fontSize: 28, fontWeight: 800, letterSpacing: '-0.6px',
                        color: result.label === 'fake' ? '#e11d48' : '#059669',
                        fontFamily: "'Outfit', sans-serif"
                      }}>
                        {inputType !== 'image' && result.confidence_score < 0.60
                          ? '⚠ LOW CONFIDENCE'
                          : result.label === 'fake'
                            ? (inputType === 'image' ? '⚠ AI-GENERATED IMAGE' : '🚨 FAKE NEWS DETECTED')
                            : (inputType === 'image' ? '✓ AUTHENTIC IMAGE' : '✓ VERIFIED / LIKELY REAL')}
                      </div>
                      <div style={{ fontSize: 14, color: '#64748b', marginTop: 4, fontWeight: 500 }}>
                        <span style={{ fontWeight: 700, color: result.label === 'fake' ? '#be123c' : '#047857' }}>
                          {Math.round(result.confidence_score * 100)}%
                        </span> {inputType === 'image' ? 'analysis confidence' : 'model prediction certainty'}
                        {inputType !== 'image' && result.confidence_score < 0.60 && (
                          <span style={{ marginLeft: 8, color: '#d97706', fontWeight: 600 }}>
                            · Class: {result.label.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Probability / Model Confidence */}
                  <div style={{ padding: '22px 28px', borderBottom: '1px solid #f1f5f9' }}>
                    {result.fake_probability !== null &&
                     result.fake_probability !== undefined &&
                     result.real_probability !== null &&
                     result.real_probability !== undefined ? (
                      <>
                        <p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14, fontWeight: 700 }}>
                          📊 Classification Probability Breakdown
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                              <span style={{ color: '#e11d48', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#e11d48' }} /> {inputType === 'image' ? 'AI-Generated / Synthetic Artifacts' : 'Fake Misinformation'}
                              </span>
                              <span style={{ color: '#0f172a', fontWeight: 800 }}>{Math.round(result.fake_probability * 100)}%</span>
                            </div>
                            <ConfidenceBar value={result.fake_probability} color="linear-gradient(90deg, #e11d48 0%, #f43f5e 100%)" />
                          </div>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                              <span style={{ color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669' }} /> {inputType === 'image' ? 'Authentic Optical Camera Capture' : 'Legitimate News'}
                              </span>
                              <span style={{ color: '#0f172a', fontWeight: 800 }}>{Math.round(result.real_probability * 100)}%</span>
                            </div>
                            <ConfidenceBar value={result.real_probability} color="linear-gradient(90deg, #059669 0%, #10b981 100%)" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14, fontWeight: 700 }}>
                          🎯 Model Decision Certainty
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                          <span style={{ color: '#6366f1', fontWeight: 700 }}>
                            {result.confidence_score < 0.60 ? 'Low confidence' : 'Decision Margin Confidence'}
                          </span>
                          <span style={{ color: '#0f172a', fontWeight: 800 }}>
                            {Math.round(result.confidence_score * 100)}%
                          </span>
                        </div>
                        <ConfidenceBar
                          value={result.confidence_score}
                          color="linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)"
                        />
                        <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.55, marginTop: 10, marginBottom: 0 }}>
                          Classifier decision-margin confidence score.
                          Predicted class: <strong style={{ color: result.label === 'fake' ? '#e11d48' : '#059669' }}>{result.label.toUpperCase()}</strong>.
                        </p>
                      </>
                    )}
                  </div>

                  {/* Explanation */}
                  <div style={{ padding: '22px 28px', borderBottom: '1px solid #f1f5f9', background: '#ffffff' }}>
                    <p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, fontWeight: 700 }}>🧠 Natural Language Reasoning</p>
                    <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.7, margin: 0, fontWeight: 400 }}>{result.explanation}</p>
                  </div>

                  {/* Explainable AI / Forensic Feature Highlighting */}
                  <div style={{ padding: '22px 28px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
                    <p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, fontWeight: 700 }}>
                      {inputType === 'image' ? '🔬 Forensic Signals & Computer Vision Breakdown' : '🔬 Explainable AI (Token Weights)'}
                    </p>
                    {inputType === 'image' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '220px', overflowY: 'auto' }}>
                        {result.word_importances && result.word_importances.length > 0 ? (
                          result.word_importances.map((item, idx) => (
                            <div key={idx} style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              borderRadius: 10,
                              background: '#ffffff',
                              border: `1px solid ${item.is_fake_indicator ? '#fecdd3' : '#a7f3d0'}`
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{
                                  fontSize: 13,
                                  width: 22,
                                  height: 22,
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: item.is_fake_indicator ? '#ffe4e6' : '#dcfce7',
                                  color: item.is_fake_indicator ? '#e11d48' : '#059669',
                                  fontWeight: 800
                                }}>
                                  {item.is_fake_indicator ? '⚠' : '✓'}
                                </span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                                  {item.word}
                                </span>
                              </div>
                              <span style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: 6,
                                background: item.is_fake_indicator ? '#fff1f2' : '#ecfdf5',
                                color: item.is_fake_indicator ? '#e11d48' : '#059669',
                                border: `1px solid ${item.is_fake_indicator ? '#fda4af' : '#6ee7b7'}`
                              }}>
                                {item.is_fake_indicator ? 'Synthetic Signal' : 'Authentic Signal'} ({Math.round(item.weight * 100)}%)
                              </span>
                            </div>
                          ))
                        ) : (
                          <div style={{ color: '#64748b', fontSize: 13 }}>No distinct forensic anomalies flagged.</div>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        padding: 16,
                        borderRadius: 14,
                        fontSize: 14,
                        color: '#1e293b',
                        lineHeight: 1.8,
                        maxHeight: '190px',
                        overflowY: 'auto',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02) inset'
                      }}>
                        <HighlightedText text={content} importances={result.word_importances} />
                      </div>
                    )}
                    <p style={{ fontSize: 11, color: '#64748b', marginTop: 8, marginBottom: 0 }}>
                      {inputType === 'image' ? (
                        <>💡 <strong style={{ color: '#e11d48' }}>Red indicators</strong> flag Generative AI synthesis signals, while <strong style={{ color: '#059669' }}>Green indicators</strong> confirm authentic optical telemetry.</>
                      ) : (
                        <>💡 <strong style={{ color: '#059669' }}>Green badges</strong> represent verified/factual signals, while <strong style={{ color: '#e11d48' }}>Red badges</strong> highlight deceptive/sensational terms.</>
                      )}
                    </p>
                  </div>

                  {/* Source Credibility */}
                  {result.source_credibility && result.source_credibility.category !== 'not_applicable' && (
                    <div style={{ padding: '20px 28px', borderBottom: '1px solid #e2e8f0' }}>
                      <p style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14, fontWeight: 600 }}>Source Credibility Assessment</p>
                      <div style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        padding: 16,
                        borderRadius: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                              {result.source_credibility.source_name}
                            </span>
                            <span style={{ fontSize: 12, color: '#64748b', display: 'block', marginTop: 2 }}>
                              Domain: {result.source_credibility.domain}
                            </span>
                          </div>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: result.source_credibility.category === 'trusted' ? '#ecfdf5' : 
                                        result.source_credibility.category === 'fact_checker' ? '#e0e7ff' : '#fff1f2',
                            color: result.source_credibility.category === 'trusted' ? '#059669' : 
                                   result.source_credibility.category === 'fact_checker' ? '#4338ca' : '#e11d48',
                            border: `1px solid ${result.source_credibility.category === 'trusted' ? '#a7f3d0' : 
                                                 result.source_credibility.category === 'fact_checker' ? '#c7d2fe' : '#fecdd3'}`
                          }}>
                            {result.source_credibility.category.replace('_', ' ')}
                          </span>
                        </div>
                        {result.source_credibility.credibility_score > 0 && (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                              <span style={{ color: '#64748b' }}>Credibility Score</span>
                              <span style={{ color: '#0f172a', fontWeight: 600 }}>{result.source_credibility.credibility_score}/100</span>
                            </div>
                            <ConfidenceBar value={result.source_credibility.credibility_score / 100} color={
                              result.source_credibility.credibility_score >= 80 ? 'linear-gradient(90deg,#059669,#10b981)' :
                              result.source_credibility.credibility_score >= 50 ? 'linear-gradient(90deg,#d97706,#f59e0b)' : 'linear-gradient(90deg,#e11d48,#f43f5e)'
                            } />
                          </div>
                        )}
                        {result.source_credibility.notes && (
                          <p style={{ fontSize: 12, color: '#64748b', margin: 0, fontStyle: 'italic', lineHeight: 1.5 }}>
                            Note: {result.source_credibility.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Social Virality Risk Assessment */}
                  {result.virality_risk && (
                    <div style={{ padding: '20px 28px', borderBottom: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <p style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, fontWeight: 600 }}>
                          Social Virality Risk Assessment
                        </p>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 99,
                          fontSize: 11,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          background: result.virality_risk.virality_risk_level === 'high' ? '#fef2f2' : result.virality_risk.virality_risk_level === 'medium' ? '#fffbeb' : '#f0fdf4',
                          color: result.virality_risk.virality_risk_level === 'high' ? '#dc2626' : result.virality_risk.virality_risk_level === 'medium' ? '#d97706' : '#16a34a',
                          border: `1px solid ${result.virality_risk.virality_risk_level === 'high' ? '#fecaca' : result.virality_risk.virality_risk_level === 'medium' ? '#fde68a' : '#bbf7d0'}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6
                        }}>
                          <span style={{
                            width: 7, height: 7, borderRadius: '50%',
                            background: result.virality_risk.virality_risk_level === 'high' ? '#ef4444' : result.virality_risk.virality_risk_level === 'medium' ? '#f59e0b' : '#22c55e',
                            display: 'inline-block',
                            boxShadow: result.virality_risk.virality_risk_level === 'high' ? '0 0 8px #ef4444' : 'none'
                          }} />
                          {result.virality_risk.virality_risk_level === 'high' ? '🚨 HIGH VIRALITY RISK' : result.virality_risk.virality_risk_level === 'medium' ? '⚠️ MODERATE VIRALITY' : '✅ LOW VIRALITY RISK'}
                        </span>
                      </div>

                      <div style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        padding: 16,
                        borderRadius: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                      }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                            <span style={{ color: '#64748b' }}>Viral Misinformation Potential</span>
                            <span style={{ color: '#0f172a', fontWeight: 700 }}>{result.virality_risk.virality_score}/100</span>
                          </div>
                          <ConfidenceBar
                            value={result.virality_risk.virality_score / 100}
                            color={
                              result.virality_risk.virality_risk_level === 'high' ? 'linear-gradient(90deg,#f97316,#ef4444)' :
                              result.virality_risk.virality_risk_level === 'medium' ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' :
                              'linear-gradient(90deg,#10b981,#34d399)'
                            }
                          />
                        </div>

                        <div>
                          <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Detected Risk Triggers:</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                            {result.virality_risk.risk_factors.map((factor, idx) => (
                              <span key={idx} style={{
                                fontSize: 11,
                                padding: '3px 8px',
                                borderRadius: 6,
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                color: '#334155',
                                fontWeight: 500
                              }}>
                                • {factor}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div style={{
                          fontSize: 12,
                          color: '#475569',
                          background: '#f8fafc',
                          padding: '10px 12px',
                          borderRadius: 8,
                          borderLeft: `3px solid ${result.virality_risk.virality_risk_level === 'high' ? '#ef4444' : result.virality_risk.virality_risk_level === 'medium' ? '#f59e0b' : '#10b981'}`
                        }}>
                          <strong>💡 Advisory:</strong> {result.virality_risk.recommendation}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fact Verification matches */}
                  <div style={{ padding: '20px 28px', borderBottom: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14, fontWeight: 600 }}>Fact Verification Matches</p>
                    {result.fact_check_results && result.fact_check_results.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {result.fact_check_results.map((fc, idx) => (
                          <div key={idx} style={{
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: 12,
                            padding: 14,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                              <span style={{ fontSize: 13, color: '#1e293b', fontWeight: 500, lineHeight: 1.4 }}>
                                "{fc.claim}"
                              </span>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                background: fc.verdict === 'real' ? '#ecfdf5' : 
                                            fc.verdict === 'fake' ? '#fff1f2' : '#fef3c7',
                                color: fc.verdict === 'real' ? '#059669' : 
                                       fc.verdict === 'fake' ? '#e11d48' : '#d97706',
                                border: `1px solid ${fc.verdict === 'real' ? '#a7f3d0' : 
                                                     fc.verdict === 'fake' ? '#fecdd3' : '#fde68a'}`,
                                flexShrink: 0
                              }}>
                                {fc.verdict.replace('_', ' ')}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#64748b', marginTop: 4 }}>
                              <span>Checked by: <a href={fc.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>{fc.source_name} ↗</a></span>
                              <span>Match: {Math.round(fc.similarity_score * 100)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '12px 16px', borderRadius: 10, background: '#ffffff', border: '1px solid #e2e8f0', color: '#64748b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
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
                        <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>{k}</div>
                        <div style={{ fontSize: 13, color: '#334155', marginTop: 2, fontWeight: 500 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Render Trending News on User UI (Analyze Tab) */}
            <div style={{ gridColumn: result ? '1 / -1' : '1' }}>
              <TrendingNewsFeed
                items={trendingNews}
                loading={trendingLoading}
                syncing={syncingLive}
                syncMessage={syncMessage}
                onRefresh={loadTrendingNews}
                onSyncLive={syncLiveNews}
                onInspect={loadPredictionDetail}
                onQuickTest={handleTestTrending}
                searchQuery={trendingSearch}
                setSearchQuery={setTrendingSearch}
                filter={trendingFilter}
                setFilter={setTrendingFilter}
              />
            </div>
          </div>
        )}

        {/* ════════ TRENDING TAB (USER UI) ════════ */}
        {tab === 'trending' && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{
                fontSize: 36, fontWeight: 800, letterSpacing: '-1px',
                background: 'linear-gradient(135deg, #0f172a 0%, #ea580c 60%, #e11d48 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                marginBottom: 8, lineHeight: 1.15
              }}>
                🔥 Live Trending News & Fact-Checks
              </h1>
              <p style={{ color: '#475569', fontSize: 16 }}>
                Explore live breaking news stories from Ada Derana, BBC News, Al Jazeera and viral claims verified by TruthGuard AI.
              </p>
            </div>

            {/* Quick Stats Banner */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 12 }}>
              <div style={{ padding: '20px', borderRadius: 16, border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>📡</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#6366f1', letterSpacing: '-0.5px' }}>{trendingNews.length}</div>
                <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Live Monitored Claims</div>
              </div>
              <div style={{ padding: '20px', borderRadius: 16, border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>⚠️</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#e11d48', letterSpacing: '-0.5px' }}>
                  {trendingNews.filter(i => i.label === 'fake').length}
                </div>
                <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Flagged as Fake</div>
              </div>
              <div style={{ padding: '20px', borderRadius: 16, border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>✅</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#059669', letterSpacing: '-0.5px' }}>
                  {trendingNews.filter(i => i.label === 'real').length}
                </div>
                <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Verified Likely Real</div>
              </div>
            </div>

            <TrendingNewsFeed
              items={trendingNews}
              loading={trendingLoading}
              syncing={syncingLive}
              syncMessage={syncMessage}
              onRefresh={loadTrendingNews}
              onSyncLive={syncLiveNews}
              onInspect={loadPredictionDetail}
              onQuickTest={handleTestTrending}
              searchQuery={trendingSearch}
              setSearchQuery={setTrendingSearch}
              filter={trendingFilter}
              setFilter={setTrendingFilter}
            />
          </div>
        )}

        {/* ════════ HISTORY TAB ════════ */}
        {tab === 'history' && (
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1px', marginBottom: 8, color: '#0f172a' }}>
              Prediction History
            </h1>
            <p style={{ color: '#64748b', marginBottom: 32 }}>All past news analysis submissions</p>

            {historyLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                <div style={{ width: 32, height: 32, border: '3px solid #c7d2fe', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
                Loading history…
              </div>
            ) : history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#334155' }}>No history yet</div>
                <div style={{ fontSize: 14 }}>Analyze some news articles to see results here.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {history.map(item => (
                  <div key={item.prediction_id} style={{
                    padding: '18px 22px', borderRadius: 14,
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    display: 'grid', gridTemplateColumns: '1fr auto',
                    gap: 16, alignItems: 'center',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                    cursor: 'pointer'
                  }}
                    onClick={() => loadPredictionDetail(item.prediction_id)}
                    onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc'; (e.currentTarget as HTMLElement).style.borderColor = '#6366f1' }}
                    onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = '#ffffff'; (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0' }}
                  >
                    <div>
                      <p style={{
                        fontSize: 14, color: '#1e293b', marginBottom: 6, fontWeight: 500,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                      }}>
                        {item.content}
                      </p>
                      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b' }}>
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
                        background: item.label === 'fake' ? '#fff1f2' : '#ecfdf5',
                        color: item.label === 'fake' ? '#e11d48' : '#059669',
                        border: `1px solid ${item.label === 'fake' ? '#fecdd3' : '#a7f3d0'}`,
                        textTransform: 'uppercase', letterSpacing: '0.5px'
                      }}>
                        {item.label}
                      </span>
                      <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
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
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 20,
              padding: 24,
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>System Reports</h2>
                <button
                  onClick={() => setShowGenerateReportModal(true)}
                  style={{
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(99,102,241,0.25)',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
                  onMouseOut={e => e.currentTarget.style.opacity = '1'}
                >
                  Generate New
                </button>
              </div>

              {reportsLoading ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748b' }}>
                  <div style={{ width: 20, height: 20, border: '2px solid #c7d2fe', borderTop: '2px solid #6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 10px' }} />
                  Loading...
                </div>
              ) : reports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>No reports yet</div>
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
                        borderColor: viewingReport?.id === rep.id ? '#6366f1' : '#e2e8f0',
                        background: viewingReport?.id === rep.id ? '#e0e7ff' : '#ffffff',
                        color: viewingReport?.id === rep.id ? '#4338ca' : '#0f172a',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        width: '100%'
                      }}
                      onMouseOver={e => { if (viewingReport?.id !== rep.id) { e.currentTarget.style.borderColor = '#818cf8'; e.currentTarget.style.background = '#f8fafc' } }}
                      onMouseOut={e => { if (viewingReport?.id !== rep.id) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#ffffff' } }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <IconFile />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rep.title}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
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
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 20,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                animation: 'slideIn 0.3s ease-out'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 16, marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>{viewingReport.title}</h2>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>Type: {viewingReport.report_type} | Saved to: {viewingReport.file_path}</p>
                  </div>
                  <button
                    onClick={() => { setViewingReport(null); setActiveReportContent(null) }}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: '6px 12px',
                      color: '#475569',
                      fontSize: 12,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a' }}
                    onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569' }}
                  >
                    Close
                  </button>
                </div>

                {activeReportContent === null ? (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                    <div style={{ width: 24, height: 24, border: '2px solid #c7d2fe', borderTop: '2px solid #6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
                    Reading report file content...
                  </div>
                ) : (
                  <pre style={{
                    fontFamily: 'monospace',
                    fontSize: 13,
                    color: '#1e293b',
                    background: '#f8fafc',
                    padding: 20,
                    borderRadius: 12,
                    overflow: 'auto',
                    margin: 0,
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    border: '1px solid #e2e8f0',
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
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1px', marginBottom: 8, color: '#0f172a' }}>
              Admin Dashboard
            </h1>
            <p style={{ color: '#64748b', marginBottom: 32 }}>System overview and analytics</p>

            {analyticsLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                <div style={{ width: 32, height: 32, border: '3px solid #c7d2fe', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
                Loading…
              </div>
            ) : analytics && (
              <>
                {/* Stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                  {[
                    { label: 'Total Users', value: analytics.total_users, color: '#6366f1', emoji: '👥' },
                    { label: 'Total Submissions', value: analytics.total_submissions, color: '#0284c7', emoji: '📨' },
                    { label: 'Model Accuracy', value: `${analytics.accuracy_percentage}%`, color: '#059669', emoji: '🎯' },
                    { label: 'Fake Detected', value: analytics.distribution.fake, color: '#e11d48', emoji: '⚠️' },
                    { label: 'Real Verified', value: analytics.distribution.real, color: '#059669', emoji: '✅' },
                  ].map(card => (
                    <div key={card.label} style={{
                      padding: '22px', borderRadius: 16,
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>{card.emoji}</div>
                      <div style={{ fontSize: 30, fontWeight: 800, color: card.color, letterSpacing: '-1px' }}>{card.value}</div>
                      <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, fontWeight: 500 }}>{card.label}</div>
                    </div>
                  ))}
                </div>

                {/* Distribution bar */}
                <div style={{ padding: '24px', borderRadius: 16, border: '1px solid #e2e8f0', background: '#ffffff', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>Prediction Distribution</h2>
                  <div style={{ display: 'flex', gap: 3, height: 20, borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
                    {analytics.distribution.fake + analytics.distribution.real > 0 ? (
                      <>
                        <div style={{ flex: analytics.distribution.fake, background: 'linear-gradient(90deg,#e11d48,#f43f5e)' }} />
                        <div style={{ flex: analytics.distribution.real, background: 'linear-gradient(90deg,#059669,#10b981)' }} />
                      </>
                    ) : (
                      <div style={{ flex: 1, background: '#e2e8f0' }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: '#e11d48' }} />
                      <span style={{ color: '#64748b' }}>Fake: <strong style={{ color: '#e11d48' }}>{analytics.distribution.fake}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: '#059669' }} />
                      <span style={{ color: '#64748b' }}>Real: <strong style={{ color: '#059669' }}>{analytics.distribution.real}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Model version control */}
                <div style={{
                  padding: '24px', borderRadius: 16,
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  marginBottom: 24,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}>
                  <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>Model Version Control</h2>
                  
                  {modelsLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748b' }}>Loading model versions...</div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
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
                            <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
                              <td style={{ padding: '12px 10px', fontWeight: 600, color: '#0f172a' }}>
                                {m.model_name}
                                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 400, marginTop: 2 }}>Trained: {formatTime(m.trained_at)}</div>
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
                                  background: m.is_active ? '#ecfdf5' : '#f1f5f9',
                                  color: m.is_active ? '#059669' : '#64748b',
                                  border: `1px solid ${m.is_active ? '#a7f3d0' : '#e2e8f0'}`
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
                                      background: '#e0e7ff',
                                      border: '1px solid #c7d2fe',
                                      borderRadius: 6,
                                      padding: '4px 10px',
                                      color: '#4338ca',
                                      fontSize: 11,
                                      fontWeight: 600,
                                      cursor: activatingModelId !== null ? 'not-allowed' : 'pointer',
                                      transition: 'all 0.2s'
                                    }}
                                    onMouseOver={e => { if (activatingModelId === null) { e.currentTarget.style.background = '#6366f1'; e.currentTarget.style.color = '#fff' } }}
                                    onMouseOut={e => { if (activatingModelId === null) { e.currentTarget.style.background = '#e0e7ff'; e.currentTarget.style.color = '#4338ca' } }}
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

                {/* Info */}
                <div style={{ padding: '20px 24px', borderRadius: 16, border: '1px solid #e2e8f0', background: '#ffffff', fontSize: 14, color: '#475569', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <strong style={{ color: '#0f172a' }}>Active Model ID:</strong> #{analytics.active_model_id} &nbsp;|&nbsp;
                  <strong style={{ color: '#0f172a' }}>Accuracy:</strong> {analytics.accuracy_percentage}%
                  <br /><br />
                  <span style={{ color: '#64748b', fontSize: 13 }}>
                    📝 This dashboard shows live system analytics and trained model controls. Trending news feed is available directly on user interfaces.
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
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, animation: 'fadeIn 0.2s ease-out'
        }}>
          <form onSubmit={handleGenerateReport} style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 20,
            padding: 32,
            width: '100%', maxWidth: 440,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.12)',
            display: 'flex', flexDirection: 'column', gap: 16
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Generate System Report</h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Create a snapshot report of prediction statistics and metrics.</p>
            
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, fontWeight: 600 }}>Report Title</label>
              <input
                type="text"
                required
                value={reportTitleInput}
                onChange={e => setReportTitleInput(e.target.value)}
                placeholder="e.g. System Audit June 2026"
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  border: '1px solid #cbd5e1', background: '#f8fafc',
                  color: '#0f172a', fontSize: 14, outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, fontWeight: 600 }}>Report Type</label>
              <select
                value={reportTypeInput}
                onChange={e => setReportTypeInput(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  border: '1px solid #cbd5e1', background: '#f8fafc',
                  color: '#0f172a', fontSize: 14, outline: 'none', boxSizing: 'border-box'
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
                  border: '1px solid #cbd5e1', background: '#ffffff',
                  color: '#475569', fontSize: 14, cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={generatingReport}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white',
                  fontSize: 14, fontWeight: 600, cursor: generatingReport ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(99,102,241,0.3)'
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
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 24, animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 24,
            padding: 32,
            width: '100%', maxWidth: 640,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {predictionDetailLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                <div style={{ width: 32, height: 32, border: '3px solid #c7d2fe', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
                Loading prediction details...
              </div>
            ) : selectedPrediction && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: 16 }}>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>Prediction Analysis #{selectedPrediction.prediction_id}</h2>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>
                      Analyzed at: {formatTime(selectedPrediction.predicted_at)} | Type: <span style={{ textTransform: 'uppercase' }}>{selectedPrediction.source_type}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    style={{
                      background: 'none', border: 'none', color: '#64748b',
                      fontSize: 20, cursor: 'pointer', padding: 0
                    }}
                  >
                    &times;
                  </button>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6, fontWeight: 600 }}>Submitted content</label>
                  <div style={{
                    maxHeight: '140px', overflowY: 'auto', background: '#f8fafc',
                    border: '1px solid #e2e8f0', padding: 12, borderRadius: 10, fontSize: 13, color: '#1e293b', lineHeight: 1.6
                  }}>
                    <HighlightedText text={selectedPrediction.input_preview} importances={selectedPrediction.word_importances} />
                  </div>
                  {selectedPrediction.source_url && (
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IconLink /> URL: <a href={selectedPrediction.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'none' }}>{selectedPrediction.source_url}</a>
                    </div>
                  )}
                </div>

                <div style={{
                  borderRadius: 16, border: `1px solid ${selectedPrediction.label === 'fake' ? '#fecdd3' : '#a7f3d0'}`,
                  background: selectedPrediction.label === 'fake' ? '#fff1f2' : '#ecfdf5',
                  padding: 20, display: 'grid', gridTemplateColumns: '120px 1fr', gap: 20, alignItems: 'center'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: 16, fontWeight: 800,
                      color: selectedPrediction.label === 'fake' ? '#e11d48' : '#059669',
                      textTransform: 'uppercase', letterSpacing: '0.5px'
                    }}>
                      {selectedPrediction.label === 'fake' ? 'Fake News' : 'Likely Real'}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                      {Math.round(selectedPrediction.confidence_score * 100)}%
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Confidence</div>
                  </div>
                  {selectedPrediction.fake_probability !== null &&
                   selectedPrediction.fake_probability !== undefined &&
                   selectedPrediction.real_probability !== null &&
                   selectedPrediction.real_probability !== undefined ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                          <span style={{ color: '#e11d48', fontWeight: 600 }}>Fake Probability</span>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>{Math.round(selectedPrediction.fake_probability * 100)}%</span>
                        </div>
                        <ConfidenceBar value={selectedPrediction.fake_probability} color="#e11d48" />
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                          <span style={{ color: '#059669', fontWeight: 600 }}>Real Probability</span>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>{Math.round(selectedPrediction.real_probability * 100)}%</span>
                        </div>
                        <ConfidenceBar value={selectedPrediction.real_probability} color="#059669" />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                        <span style={{ color: '#6366f1', fontWeight: 600 }}>Model Confidence</span>
                        <span style={{ color: '#0f172a', fontWeight: 600 }}>{Math.round(selectedPrediction.confidence_score * 100)}%</span>
                      </div>
                      <ConfidenceBar value={selectedPrediction.confidence_score} color="#6366f1" />
                      <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.5, marginTop: 7 }}>
                        Decision-margin confidence; calibrated Fake/Real probabilities are not available for Linear SVM.
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6, fontWeight: 600 }}>Model Analysis Explanation</label>
                  <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, margin: 0 }}>
                    {selectedPrediction.explanation}
                  </p>
                </div>

                {/* Source Credibility */}
                {selectedPrediction.source_credibility && selectedPrediction.source_credibility.category !== 'not_applicable' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6, fontWeight: 600 }}>Source Credibility Assessment</label>
                    <div style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      padding: 16,
                      borderRadius: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                            {selectedPrediction.source_credibility.source_name}
                          </span>
                          <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 2 }}>
                            Domain: {selectedPrediction.source_credibility.domain}
                          </span>
                        </div>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: selectedPrediction.source_credibility.category === 'trusted' ? '#ecfdf5' : 
                                      selectedPrediction.source_credibility.category === 'fact_checker' ? '#e0e7ff' : '#fff1f2',
                          color: selectedPrediction.source_credibility.category === 'trusted' ? '#059669' : 
                                 selectedPrediction.source_credibility.category === 'fact_checker' ? '#4338ca' : '#e11d48',
                          border: `1px solid ${selectedPrediction.source_credibility.category === 'trusted' ? '#a7f3d0' : 
                                               selectedPrediction.source_credibility.category === 'fact_checker' ? '#c7d2fe' : '#fecdd3'}`
                        }}>
                          {selectedPrediction.source_credibility.category.replace('_', ' ')}
                        </span>
                      </div>
                      {selectedPrediction.source_credibility.credibility_score > 0 && (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                            <span style={{ color: '#64748b' }}>Credibility Score</span>
                            <span style={{ color: '#0f172a', fontWeight: 600 }}>{selectedPrediction.source_credibility.credibility_score}/100</span>
                          </div>
                          <ConfidenceBar value={selectedPrediction.source_credibility.credibility_score / 100} color={
                            selectedPrediction.source_credibility.credibility_score >= 80 ? '#059669' :
                            selectedPrediction.source_credibility.credibility_score >= 50 ? '#d97706' : '#e11d48'
                          } />
                        </div>
                      )}
                      {selectedPrediction.source_credibility.notes && (
                        <p style={{ fontSize: 11, color: '#64748b', margin: 0, fontStyle: 'italic', lineHeight: 1.4 }}>
                          Note: {selectedPrediction.source_credibility.notes}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Virality Risk in Modal */}
                {selectedPrediction.virality_risk && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6, fontWeight: 600 }}>Social Virality Risk Assessment</label>
                    <div style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      padding: 16,
                      borderRadius: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                          Virality Risk: {selectedPrediction.virality_risk.virality_score}/100
                        </span>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: selectedPrediction.virality_risk.virality_risk_level === 'high' ? '#fef2f2' : selectedPrediction.virality_risk.virality_risk_level === 'medium' ? '#fffbeb' : '#f0fdf4',
                          color: selectedPrediction.virality_risk.virality_risk_level === 'high' ? '#dc2626' : selectedPrediction.virality_risk.virality_risk_level === 'medium' ? '#d97706' : '#16a34a',
                          border: `1px solid ${selectedPrediction.virality_risk.virality_risk_level === 'high' ? '#fecaca' : selectedPrediction.virality_risk.virality_risk_level === 'medium' ? '#fde68a' : '#bbf7d0'}`
                        }}>
                          {selectedPrediction.virality_risk.virality_risk_level} RISK
                        </span>
                      </div>
                      <ConfidenceBar
                        value={selectedPrediction.virality_risk.virality_score / 100}
                        color={selectedPrediction.virality_risk.virality_risk_level === 'high' ? '#ef4444' : selectedPrediction.virality_risk.virality_risk_level === 'medium' ? '#f59e0b' : '#10b981'}
                      />
                      <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', marginTop: 4 }}>
                        {selectedPrediction.virality_risk.recommendation}
                      </div>
                    </div>
                  </div>
                )}

                {/* Fact Verification matches */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6, fontWeight: 600 }}>Fact Verification Matches</label>
                  {selectedPrediction.fact_check_results && selectedPrediction.fact_check_results.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {selectedPrediction.fact_check_results.map((fc: any, idx: number) => (
                        <div key={idx} style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          padding: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                            <span style={{ fontSize: 12, color: '#1e293b', fontWeight: 500, lineHeight: 1.4 }}>
                              "{fc.claim}"
                            </span>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 9,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: fc.verdict === 'real' ? '#ecfdf5' : 
                                          fc.verdict === 'fake' ? '#fff1f2' : '#fef3c7',
                              color: fc.verdict === 'real' ? '#059669' : 
                                     fc.verdict === 'fake' ? '#e11d48' : '#d97706',
                              border: `1px solid ${fc.verdict === 'real' ? '#a7f3d0' : 
                                                   fc.verdict === 'fake' ? '#fecdd3' : '#fde68a'}`,
                              flexShrink: 0
                            }}>
                              {fc.verdict.replace('_', ' ')}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            <span>Checked by: <a href={fc.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>{fc.source_name} ↗</a></span>
                            <span>Match: {Math.round(fc.similarity_score * 100)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '10px 14px', borderRadius: 10, background: '#ffffff', border: '1px solid #e2e8f0', color: '#64748b', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      ℹ No direct verified fact-checks found matching this content.
                    </div>
                  )}
                </div>

                {/* Similar Past Analyses */}
                {selectedPrediction.related_predictions && selectedPrediction.related_predictions.length > 0 && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6, fontWeight: 600 }}>Similar Past Analyses</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {selectedPrediction.related_predictions.map((rel: any, idx: number) => (
                        <div key={idx} 
                          onClick={() => loadPredictionDetail(rel.prediction_id)}
                          style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          padding: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc'; (e.currentTarget as HTMLElement).style.borderColor = '#6366f1' }}
                        onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = '#ffffff'; (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                            <span style={{ fontSize: 12, color: '#1e293b', fontWeight: 500, lineHeight: 1.4 }}>
                              {rel.content_preview}
                            </span>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 9,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: rel.label === 'fake' ? '#fff1f2' : '#ecfdf5',
                              color: rel.label === 'fake' ? '#e11d48' : '#059669',
                              border: `1px solid ${rel.label === 'fake' ? '#fecdd3' : '#a7f3d0'}`,
                              flexShrink: 0
                            }}>
                              {rel.label}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            <span>Prediction #{rel.prediction_id}</span>
                            <span>Content Match: {Math.round(rel.similarity_score * 100)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{
                  borderTop: '1px solid #e2e8f0', paddingTop: 16,
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, fontSize: 11, color: '#64748b'
                }}>
                  <div>
                    <span style={{ display: 'block', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Model Version</span>
                    <strong style={{ color: '#1e293b', display: 'block', marginTop: 2 }}>{selectedPrediction.model_version.model_name}</strong>
                  </div>
                  <div>
                    <span style={{ display: 'block', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Algorithm</span>
                    <strong style={{ color: '#1e293b', display: 'block', marginTop: 2 }}>{selectedPrediction.model_version.algorithm}</strong>
                  </div>
                  <div>
                    <span style={{ display: 'block', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Processing time</span>
                    <strong style={{ color: '#1e293b', display: 'block', marginTop: 2 }}>{selectedPrediction.processing_time_ms} ms</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    style={{
                      background: '#f1f5f9', border: '1px solid #e2e8f0',
                      borderRadius: 8, padding: '8px 20px', color: '#0f172a', fontSize: 13, cursor: 'pointer', fontWeight: 500
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
        borderTop: '1px solid #e2e8f0',
        background: '#ffffff',
        padding: '20px 24px', textAlign: 'center',
        fontSize: 13, color: '#64748b'
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