import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts'
import { QRCodeSVG } from 'qrcode.react'
import { T } from '../tokens'
import {
  Card, Stencil, MIcon, HUDGrid, Chip, LivePulse,
  StatusBadge, GhostBtn, PrimaryBtn, CornerBrackets,
} from '../components/ui'
import { subscribeToSession, updateSessionStatus } from '../services/liveSessionService'
import { subscribeToQuestions, setActiveQuestion } from '../services/questionService'
import { subscribeToResponses, subscribeToAllSessionResponses } from '../services/responseService'
import { clusterResponses } from '../services/themeClusteringService'
import { createIssue } from '../services/issueService'
import { seedDemoData, USE_MOCK } from '../services'
import type { LiveSession, Question, Response, ThemeCluster } from '../models'
import { countOptionResponses, averageRating } from '../utils/percentages'

const CHART_COLORS = [T.primary, T.accentBlue, T.success, T.es, T.ep, T.ea, T.spectrum, T.radar]

const CAT_COLOR: Record<string, string> = {
  equipment: T.error, time: T.warning, instructor: T.es,
  content: T.info, practice: T.spectrum, assessment: T.ep,
  location: T.drone, safety: T.radar, other: T.fg3,
}

function clusterToIssueCategory(cat: string) {
  const map: Record<string, string> = {
    equipment: 'EQUIP', time: 'TIME', instructor: 'INSTR',
    content: 'DOC', practice: 'CURR', assessment: 'ASSESS',
  }
  return map[cat] ?? 'OTHER'
}

// ─────────────────────────────────────────────────────────────────
// BubbleCloud — animated SVG-backed bubble cloud
// ─────────────────────────────────────────────────────────────────
function BubbleCloud({
  clusters, selected, onSelect, large = false,
}: {
  clusters: ThemeCluster[]
  selected: ThemeCluster | null
  onSelect: (cl: ThemeCluster | null) => void
  large?: boolean
}) {
  if (!clusters.length) return null
  const max = Math.max(...clusters.map(c => c.count), 1)
  const baseMin = large ? 80 : 52
  const baseMax = large ? 160 : 110

  return (
    <div
      className="relative flex flex-wrap gap-4 justify-center items-center py-3"
      style={{ minHeight: large ? 200 : 140 }}
    >
      {clusters.map((cl, i) => {
        const ratio   = cl.count / max
        const size    = Math.round(baseMin + ratio * (baseMax - baseMin))
        const fs      = Math.round((large ? 11 : 9) + ratio * 6)
        const subFs   = Math.max(7, fs - 3)
        const active  = selected?.clusterId === cl.clusterId
        const color   = CAT_COLOR[cl.category] ?? T.accentPurple
        const glowing = active || ratio > 0.7

        return (
          <button
            key={cl.clusterId}
            type="button"
            onClick={() => onSelect(active ? null : cl)}
            title={`${cl.themeTitle} — ${cl.count} คน (${cl.percentage}%)`}
            className="relative rounded-full flex flex-col items-center justify-center font-semibold select-none"
            style={{
              width: size, height: size,
              fontSize: fs, lineHeight: 1.25,
              background: active
                ? `radial-gradient(circle at 40% 35%, ${color}EE, ${color}AA)`
                : `radial-gradient(circle at 40% 35%, ${color}40, ${color}1A)`,
              color: active ? '#0D1117' : color,
              border: `2px solid ${color}${active ? 'FF' : '80'}`,
              boxShadow: glowing
                ? `0 0 ${active ? 28 : 14}px ${color}${active ? '90' : '50'}, inset 0 1px 0 rgba(255,255,255,0.15)`
                : '0 2px 8px rgba(0,0,0,.4)',
              transform: active ? 'scale(1.12)' : 'scale(1)',
              transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
              flexShrink: 0,
              animationDelay: `${i * 50}ms`,
              zIndex: active ? 2 : 1,
            }}
          >
            {/* Glow ring */}
            {(active || ratio > 0.5) && (
              <span
                className="absolute inset-0 rounded-full"
                style={{
                  border: `1px solid ${color}40`,
                  transform: 'scale(1.15)',
                  opacity: active ? 0.8 : 0.4,
                }}
              />
            )}
            <span className="font-bold leading-none relative">{cl.percentage}%</span>
            <span
              className="leading-none opacity-80 relative"
              style={{ fontSize: subFs, marginTop: 2 }}
            >
              {cl.count} คน
            </span>
            {/* Theme label for large mode */}
            {large && (
              <span
                className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-center font-semibold"
                style={{ fontSize: 10, color, maxWidth: 120 }}
              >
                {cl.themeTitle.length > 14 ? cl.themeTitle.slice(0, 13) + '…' : cl.themeTitle}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// ClusterDetail — expandable detail + create issue
// ─────────────────────────────────────────────────────────────────
function ClusterDetail({
  cluster, onCreateIssue, onClose, issuedIds,
}: {
  cluster: ThemeCluster
  onCreateIssue: (cl: ThemeCluster) => Promise<void>
  onClose: () => void
  issuedIds: Set<string>
}) {
  const [busy, setBusy] = useState(false)
  const color = CAT_COLOR[cluster.category] ?? T.accentPurple
  const issued = issuedIds.has(cluster.clusterId)

  async function handle() {
    setBusy(true)
    await onCreateIssue(cluster)
    setBusy(false)
  }

  return (
    <div
      className="p-4 rounded-2xl flex flex-col gap-3"
      style={{ background: color + '10', border: `1px solid ${color}40` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <Stencil color={color}>{cluster.category} · {cluster.count} คน · {cluster.percentage}%</Stencil>
          <p className="mt-1 font-bold text-[15px]" style={{ color: T.fg1 }}>{cluster.themeTitle}</p>
        </div>
        <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 shrink-0">
          <MIcon name="close" size={16} color={T.fg3} />
        </button>
      </div>

      {/* Quotes */}
      <div className="flex flex-col gap-1.5">
        {cluster.representativeComments.map((c, i) => (
          <p
            key={i}
            className="text-[12px] py-2 px-3 rounded-xl"
            style={{ color: T.fg1, background: T.card, borderLeft: `3px solid ${color}` }}
          >
            "{c}"
          </p>
        ))}
      </div>

      {/* Keywords */}
      {cluster.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {cluster.keywords.slice(0, 6).map(kw => (
            <span key={kw} className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: color + '22', color }}>
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* Create Issue */}
      {issued ? (
        <div className="flex items-center gap-2 text-[12px]" style={{ color: T.success }}>
          <MIcon name="check_circle" size={15} color={T.success} fill={1} />
          สร้าง Issue จาก Theme นี้แล้ว
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={handle}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold hover:opacity-80 disabled:opacity-40 transition-all"
          style={{ background: T.error + '22', color: T.error, border: `1px solid ${T.error}50` }}
        >
          <MIcon name="add_circle" size={16} color={T.error} fill={1} />
          {busy ? 'กำลังสร้าง Issue...' : 'สร้าง Issue จาก Theme นี้'}
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// RatingDisplay
// ─────────────────────────────────────────────────────────────────
function RatingDisplay({ avg, count, large = false }: { avg: number; count: number; large?: boolean }) {
  const filled = Math.round(avg)
  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <span
        className="font-bold tracking-tight leading-none"
        style={{ fontSize: large ? 96 : 64, color: T.primary }}
      >
        {avg.toFixed(1)}
      </span>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(n => (
          <span
            key={n}
            style={{
              fontSize: large ? 40 : 28,
              color: n <= filled ? T.primary : T.surfaceLight,
              transition: 'color 0.3s',
              filter: n <= filled ? `drop-shadow(0 0 6px ${T.primary}80)` : 'none',
            }}
          >★</span>
        ))}
      </div>
      <p style={{ fontSize: large ? 18 : 13, color: T.fg2 }}>
        คะแนนเฉลี่ย · {count} คนตอบ
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// MainPage
// ─────────────────────────────────────────────────────────────────
export default function LiveDashboardPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const nav = useNavigate()

  const [session,          setSession]          = useState<LiveSession | null>(null)
  const [questions,        setQuestions]        = useState<Question[]>([])
  const [allResponses,     setAllResponses]     = useState<Response[]>([])
  const [activeResponses,  setActiveResponses]  = useState<Response[]>([])
  const [clusters,         setClusters]         = useState<ThemeCluster[]>([])
  const [selectedCluster,  setSelectedCluster]  = useState<ThemeCluster | null>(null)
  const [issuedIds,        setIssuedIds]        = useState<Set<string>>(new Set())
  const [showQR,           setShowQR]           = useState(false)
  const [presMode,         setPresMode]         = useState(false)
  const [seedBusy,         setSeedBusy]         = useState(false)
  const [seedMsg,          setSeedMsg]          = useState('')
  const presRef = useRef<HTMLDivElement>(null)

  // ── subscriptions ────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return
    const u1 = subscribeToSession(sessionId, setSession)
    const u2 = subscribeToQuestions(sessionId, setQuestions)
    const u3 = subscribeToAllSessionResponses(sessionId, setAllResponses)
    return () => { u1(); u2(); u3() }
  }, [sessionId])

  const activeQ = questions.find(q => q.questionId === session?.currentQuestionId) ?? questions[0]

  useEffect(() => {
    if (!sessionId || !activeQ) return
    setSelectedCluster(null)
    const u = subscribeToResponses(sessionId, activeQ.questionId, rs => {
      setActiveResponses(rs)
      setClusters(activeQ.type === 'openText' ? clusterResponses(rs, sessionId, activeQ.questionId) : [])
    })
    return u
  }, [sessionId, activeQ?.questionId])

  // ── keyboard shortcuts ───────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Escape')                   { setShowQR(false); setPresMode(false) }
      if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.metaKey) setPresMode(v => !v)
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey) toggleFullscreen()
      if ((e.key === 'q' || e.key === 'Q') && !e.ctrlKey && !e.metaKey) setShowQR(v => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── actions ──────────────────────────────────────────────────
  async function activateQuestion(qId: string) {
    if (!sessionId) return
    if (activeQ) await setActiveQuestion(activeQ.questionId, false)
    await setActiveQuestion(qId, true)
    await updateSessionStatus(sessionId, 'active', qId)
  }

  async function closeSession() {
    if (!sessionId) return
    await updateSessionStatus(sessionId, 'closed')
    nav('/sessions')
  }

  async function handleCreateIssue(cluster: ThemeCluster) {
    if (!session) return
    await createIssue({
      courseId:         session.courseId,
      batchId:          session.batchId,
      sourceSessionId:  session.sessionId,
      sourceQuestionId: cluster.questionId,
      sourceClusterId:  cluster.clusterId,
      title:            cluster.themeTitle,
      category:         clusterToIssueCategory(cluster.category) as Parameters<typeof createIssue>[0]['category'],
      severity:         cluster.percentage >= 30 ? 'P1' : cluster.percentage >= 20 ? 'P2' : 'P3',
      frequencyCount:   cluster.count,
      percentage:       cluster.percentage,
      status:           'open',
    })
    setIssuedIds(s => new Set([...s, cluster.clusterId]))
  }

  async function handleSeed() {
    setSeedBusy(true); setSeedMsg('')
    const { created, skipped } = await seedDemoData()
    setSeedMsg(`✅ ${created.join(', ')}${skipped.length ? ` · ⏭ ${skipped.join(', ')}` : ''}`)
    setSeedBusy(false)
  }

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) presRef.current?.requestFullscreen?.()
    else document.exitFullscreen?.()
  }, [])

  // ── derived ──────────────────────────────────────────────────
  const totalResponders = new Set(allResponses.map(r => r.studentAlias)).size
  const joinUrl   = `${window.location.origin}/join/${session?.joinCode ?? ''}`
  const chartData = activeQ && (activeQ.type === 'multipleChoice' || activeQ.type === 'yesNo')
    ? countOptionResponses(activeResponses, activeQ.options) : []
  const avgRating = activeQ?.type === 'rating' ? averageRating(activeResponses) : null
  const respPct   = totalResponders > 0 ? Math.round((activeResponses.length / totalResponders) * 100) : 0
  const qIdx      = questions.findIndex(q => q.questionId === activeQ?.questionId)

  // ── QR overlay (shared) ──────────────────────────────────────
  const QROverlay = showQR ? (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(5,6,8,0.92)' }}
      onClick={() => setShowQR(false)}
    >
      <div
        className="relative flex flex-col items-center gap-5 p-10 rounded-3xl"
        style={{ background: T.surface, border: `1px solid ${T.border}` }}
        onClick={e => e.stopPropagation()}
      >
        <CornerBrackets color={T.primary} size={18} />
        <Stencil color={T.primary} className="text-[13px] tracking-[4px]">Join Code</Stencil>
        <span className="font-mono text-[48px] font-bold tracking-[14px]" style={{ color: T.primary }}>
          {session?.joinCode}
        </span>
        <QRCodeSVG value={joinUrl} size={240} bgColor={T.surface} fgColor={T.fg1} level="H" />
        <p className="text-[11px]" style={{ color: T.fg3 }}>{joinUrl}</p>
        <GhostBtn onClick={() => setShowQR(false)} icon="close">ปิด (Esc)</GhostBtn>
      </div>
    </div>
  ) : null

  // ────────────────────────────────────────────────────────────────
  // PRESENTATION MODE — fixed overlay covering full viewport + sidebar
  // ────────────────────────────────────────────────────────────────
  if (presMode) {
    return (
      <>
        {QROverlay}
        <div
          ref={presRef}
          className="fixed inset-0 z-[100] flex flex-col overflow-auto"
          style={{ background: T.bg, fontFamily: 'Sarabun, system-ui, sans-serif' }}
        >
          <HUDGrid opacity={0.04} />

          {/* ── Pres top bar ─────────────────────────────────── */}
          <header
            className="relative z-10 flex items-center justify-between px-8 py-3 shrink-0"
            style={{ background: T.surface + 'E0', borderBottom: `1px solid ${T.primary}30` }}
          >
            {/* Left: branding + live */}
            <div className="flex items-center gap-4">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{ background: T.error + '18', border: `1px solid ${T.error}40` }}
              >
                <span
                  className="w-2 h-2 rounded-full animate-live-pulse"
                  style={{ background: T.error, boxShadow: `0 0 8px ${T.error}` }}
                />
                <span className="font-mono text-[11px] font-bold tracking-[3px]" style={{ color: T.error }}>
                  LIVE AAR
                </span>
              </div>
              <div className="hidden md:block">
                <p className="text-[13px] font-bold" style={{ color: T.fg1 }}>{session?.title}</p>
                <p className="text-[10px] font-mono" style={{ color: T.fg3 }}>{session?.joinCode} · RADIO & EW DEPT.</p>
              </div>
            </div>

            {/* Right: stats + controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: T.accentBlue + '15', border: `1px solid ${T.accentBlue}30` }}>
                <MIcon name="group" size={14} color={T.accentBlue} fill={1} />
                <span className="font-mono text-[13px] font-bold" style={{ color: T.accentBlue }}>{totalResponders}</span>
                <span className="text-[10px]" style={{ color: T.fg3 }}>คน</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: T.success + '15', border: `1px solid ${T.success}30` }}>
                <MIcon name="done" size={14} color={T.success} fill={1} />
                <span className="font-mono text-[13px] font-bold" style={{ color: T.success }}>{activeResponses.length}</span>
                <span className="text-[10px]" style={{ color: T.fg3 }}>ตอบ</span>
              </div>
              <span className="text-[11px]" style={{ color: T.fg3 }}>P: pres · F: fullscreen · Q: QR · Esc: ออก</span>
              <GhostBtn onClick={() => setShowQR(true)} icon="qr_code" size="sm">QR</GhostBtn>
              <GhostBtn onClick={toggleFullscreen} icon="fullscreen" size="sm">Full</GhostBtn>
              <button
                type="button"
                onClick={() => setPresMode(false)}
                className="px-3 py-1.5 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 hover:opacity-80"
                style={{ background: T.error + '18', color: T.error, border: `1px solid ${T.error}40` }}
              >
                <MIcon name="close" size={14} color={T.error} />
                ออก
              </button>
            </div>
          </header>

          {/* ── Pres main 3-column ───────────────────────────── */}
          <div className="relative flex-1 grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-0 overflow-hidden">

            {/* Left panel: question nav + QR */}
            <div
              className="flex flex-col gap-4 p-6 border-r overflow-y-auto"
              style={{ borderColor: T.border + '60' }}
            >
              {/* Question list mini */}
              <div>
                <Stencil color={T.fg3} className="mb-3">คำถาม {qIdx + 1} / {questions.length}</Stencil>
                <div className="flex flex-col gap-2">
                  {questions.map((q, i) => {
                    const isCurr = q.questionId === activeQ?.questionId
                    const cnt = allResponses.filter(r => r.questionId === q.questionId).length
                    return (
                      <div
                        key={q.questionId}
                        onClick={() => session?.status === 'active' && activateQuestion(q.questionId)}
                        className="p-2.5 rounded-xl cursor-pointer transition-all"
                        style={{
                          background: isCurr ? T.primary + '18' : T.surfaceLight,
                          border: `1px solid ${isCurr ? T.primary + '60' : T.border}`,
                          opacity: isCurr ? 1 : 0.7,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px]" style={{ color: isCurr ? T.primary : T.fg3 }}>Q{i + 1}</span>
                          <span className="text-[10px]" style={{ color: T.fg3 }}>{cnt} ✓</span>
                        </div>
                        <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: isCurr ? T.fg1 : T.fg2 }}>{q.text}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* QR code panel */}
              <div
                className="relative flex flex-col items-center gap-3 p-4 rounded-2xl mt-auto"
                style={{ background: T.surface, border: `1px solid ${T.border}` }}
              >
                <CornerBrackets color={T.primary} size={12} />
                <Stencil color={T.fg3}>Student Join</Stencil>
                <QRCodeSVG value={joinUrl} size={140} bgColor={T.surface} fgColor={T.fg1} level="H" />
                <span
                  className="font-mono font-bold tracking-[6px]"
                  style={{ fontSize: 22, color: T.primary, textShadow: `0 0 16px ${T.primary}80` }}
                >
                  {session?.joinCode}
                </span>
              </div>
            </div>

            {/* Center panel: main result */}
            <div className="flex flex-col items-center justify-center p-8 gap-6 overflow-y-auto">
              {activeQ ? (
                <>
                  {/* Question text */}
                  <div className="text-center w-full max-w-2xl">
                    <p className="text-[13px] font-mono mb-3" style={{ color: T.primary }}>
                      คำถามที่ {qIdx + 1} / {questions.length}
                    </p>
                    <p
                      className="font-bold leading-snug"
                      style={{ fontSize: 'clamp(22px, 3vw, 36px)', color: T.fg1 }}
                    >
                      {activeQ.text}
                    </p>
                  </div>

                  {/* Chart */}
                  {chartData.length > 0 && (
                    <div className="w-full max-w-2xl">
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={chartData} layout="vertical" margin={{ left: 16, right: 90, top: 4, bottom: 4 }}>
                          <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: T.fg3, fontSize: 13 }} />
                          <YAxis type="category" dataKey="option" tick={{ fill: T.fg1, fontSize: 15 }} width={200} />
                          <Bar dataKey="pct" radius={[0, 6, 6, 0]}
                            label={{
                              position: 'right',
                              formatter: (v: unknown) => `${typeof v === 'number' ? v : 0}%`,
                              fill: T.fg1, fontSize: 15, fontWeight: 700,
                            }}
                          >
                            {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Rating */}
                  {avgRating !== null && <RatingDisplay avg={avgRating} count={activeResponses.length} large />}

                  {/* Open text bubble cloud (big) */}
                  {activeQ.type === 'openText' && clusters.length > 0 && (
                    <div className="w-full max-w-2xl">
                      <Stencil color={T.accentPurple} className="mb-6 text-center block">AI Theme Clusters</Stencil>
                      <BubbleCloud clusters={clusters} selected={selectedCluster} onSelect={setSelectedCluster} large />
                      {selectedCluster && (
                        <div className="mt-8">
                          <ClusterDetail
                            cluster={selectedCluster}
                            onCreateIssue={handleCreateIssue}
                            onClose={() => setSelectedCluster(null)}
                            issuedIds={issuedIds}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Live feed for open text */}
                  {activeQ.type === 'openText' && activeResponses.length > 0 && clusters.length === 0 && (
                    <div className="w-full max-w-2xl flex flex-col gap-2 max-h-64 overflow-y-auto">
                      {[...activeResponses].reverse().slice(0, 6).map(r => (
                        <div key={r.responseId} className="px-4 py-2.5 rounded-xl text-[14px]"
                          style={{ background: T.surfaceLight, color: T.fg1 }}>
                          <span className="font-mono text-[11px] mr-3" style={{ color: T.fg3 }}>{r.studentAlias}</span>
                          {r.answerText}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[20px]" style={{ color: T.fg3 }}>รอคำถาม...</p>
              )}
            </div>

            {/* Right panel: counters + controls */}
            <div
              className="flex flex-col gap-4 p-6 border-l overflow-y-auto"
              style={{ borderColor: T.border + '60' }}
            >
              {/* Big counters */}
              {[
                { label: 'ตอบแล้ว',   value: activeResponses.length, color: T.success, icon: 'done_all' },
                { label: 'คนทั้งหมด', value: totalResponders,         color: T.accentBlue, icon: 'group' },
                { label: '% ตอบ',     value: `${respPct}%`,          color: T.primary, icon: 'percent' },
              ].map(s => (
                <div
                  key={s.label}
                  className="relative p-4 rounded-2xl flex flex-col items-center"
                  style={{ background: s.color + '12', border: `1px solid ${s.color}30` }}
                >
                  <MIcon name={s.icon} size={20} color={s.color} fill={1} />
                  <span
                    className="font-bold mt-1 font-mono leading-none"
                    style={{ fontSize: 48, color: s.color, textShadow: `0 0 20px ${s.color}60` }}
                  >
                    {s.value}
                  </span>
                  <Stencil color={s.color + 'AA'} className="mt-1">{s.label}</Stencil>
                </div>
              ))}

              {/* Session controls */}
              <div className="flex flex-col gap-2 mt-auto pt-4 border-t" style={{ borderColor: T.border }}>
                {session?.status === 'active' && (
                  <button
                    type="button"
                    onClick={closeSession}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold hover:opacity-80 transition-opacity"
                    style={{ background: T.error + '18', color: T.error, border: `1px solid ${T.error}40` }}
                  >
                    <MIcon name="stop_circle" size={16} color={T.error} />
                    ปิด Session
                  </button>
                )}
                {session?.status === 'draft' && (
                  <PrimaryBtn
                    onClick={() => sessionId && updateSessionStatus(sessionId, 'active', activeQ?.questionId ?? null)}
                    icon="play_arrow"
                  >
                    เริ่ม Session
                  </PrimaryBtn>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ────────────────────────────────────────────────────────────────
  // NORMAL DASHBOARD LAYOUT
  // ────────────────────────────────────────────────────────────────
  return (
    <>
      {QROverlay}
      <div className="relative min-h-screen" style={{ background: T.bg }}>
        <HUDGrid opacity={0.03} />

        {/* Top bar */}
        <header className="relative flex items-center gap-3 px-6 py-3 border-b" style={{ borderColor: T.border, background: T.surface }}>
          <button type="button" onClick={() => nav('/sessions')} className="p-1.5 rounded-lg hover:bg-white/5">
            <MIcon name="arrow_back" size={18} color={T.fg2} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-mono" style={{ color: T.fg3 }}>{session?.joinCode}</p>
            <p className="text-[15px] font-bold truncate" style={{ color: T.fg1 }}>{session?.title}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {session?.status === 'active' && <LivePulse />}
            <StatusBadge status={session?.status ?? 'draft'} />
            <Chip color={T.accentBlue} icon="group">{totalResponders} คน</Chip>

            {USE_MOCK && (
              <button type="button" onClick={handleSeed} disabled={seedBusy}
                className="px-2 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1 hover:opacity-80 disabled:opacity-40"
                style={{ background: T.accentBlue + '20', color: T.accentBlue, border: `1px solid ${T.accentBlue}40` }}
              >
                <MIcon name="science" size={13} color={T.accentBlue} />
                {seedBusy ? 'Seeding...' : 'Seed Demo'}
              </button>
            )}
            {seedMsg && <span className="text-[10px] max-w-[200px] truncate" style={{ color: T.success }}>{seedMsg}</span>}

            <GhostBtn onClick={() => setShowQR(true)} icon="qr_code" size="sm">QR (Q)</GhostBtn>
            <PrimaryBtn onClick={() => setPresMode(true)} icon="present_to_all" size="sm">Pres (P)</PrimaryBtn>
            <GhostBtn onClick={toggleFullscreen} icon="fullscreen" size="sm">Full (F)</GhostBtn>

            {session?.status === 'active' && (
              <button type="button" onClick={closeSession}
                className="px-3 py-1.5 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 hover:opacity-80"
                style={{ background: T.error + '20', color: T.error, border: `1px solid ${T.error}40` }}
              >
                <MIcon name="stop_circle" size={14} color={T.error} />
                ปิด Session
              </button>
            )}
            {session?.status === 'draft' && (
              <PrimaryBtn onClick={() => sessionId && updateSessionStatus(sessionId, 'active', activeQ?.questionId ?? null)} icon="play_arrow" size="sm">
                เริ่ม Session
              </PrimaryBtn>
            )}
          </div>
        </header>

        {/* Body grid */}
        <div className="relative p-4 grid grid-cols-1 xl:grid-cols-4 gap-4">

          {/* Left: question list */}
          <div className="xl:col-span-1">
            <Card padding={14}>
              <Stencil color={T.primary} className="mb-3">คำถาม ({questions.length})</Stencil>
              <div className="flex flex-col gap-2">
                {questions.map((q, i) => {
                  const isCurr = q.questionId === (session?.currentQuestionId ?? questions[0]?.questionId)
                  const cnt = allResponses.filter(r => r.questionId === q.questionId).length
                  return (
                    <div key={q.questionId}
                      onClick={() => session?.status === 'active' && activateQuestion(q.questionId)}
                      className="p-3 rounded-xl cursor-pointer transition-all hover:bg-white/5"
                      style={{ background: isCurr ? T.primary + '18' : T.surfaceLight, border: `1px solid ${isCurr ? T.primary + '60' : T.border}` }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px]" style={{ color: isCurr ? T.primary : T.fg3 }}>Q{i + 1}</span>
                        <span className="text-[10px]" style={{ color: T.fg3 }}>{cnt} ✓</span>
                      </div>
                      <p className="text-[12px] line-clamp-2" style={{ color: isCurr ? T.fg1 : T.fg2 }}>{q.text || '(ยังไม่ระบุ)'}</p>
                      <p className="text-[10px] mt-0.5 capitalize" style={{ color: isCurr ? T.primary + '99' : T.fg3 }}>{q.type}</p>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>

          {/* Center: result display */}
          <div className="xl:col-span-2 flex flex-col gap-4">
            {activeQ ? (
              <Card accent={T.primary + '50'} glow={session?.status === 'active' ? T.primary : undefined}>
                <div className="flex items-center gap-2 mb-3">
                  <Stencil color={T.primary}>คำถามปัจจุบัน</Stencil>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase"
                    style={{ background: T.accentBlue + '20', color: T.accentBlue }}>
                    {activeQ.type}
                  </span>
                </div>
                <p className="text-[17px] font-semibold mb-5 leading-snug" style={{ color: T.fg1 }}>{activeQ.text}</p>

                {chartData.length > 0 && (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 52, top: 0, bottom: 0 }}>
                        <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: T.fg3, fontSize: 11 }} />
                        <YAxis type="category" dataKey="option" tick={{ fill: T.fg2, fontSize: 12 }} width={170} />
                        <Bar dataKey="pct" radius={[0, 4, 4, 0]}
                          label={{ position: 'right', formatter: (v: unknown) => `${typeof v === 'number' ? v : 0}%`, fill: T.fg1, fontSize: 12, fontWeight: 600 }}
                        >
                          {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-2 flex gap-3 flex-wrap">
                      {chartData.map((d, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-[11px]" style={{ color: T.fg2 }}>{d.option}</span>
                          <span className="text-[11px] font-bold" style={{ color: T.fg1 }}>{d.count} คน</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {avgRating !== null && <RatingDisplay avg={avgRating} count={activeResponses.length} />}

                {activeQ.type === 'openText' && activeResponses.length > 0 && (
                  <div className="mt-2">
                    <Stencil color={T.fg3} className="mb-2">ความคิดเห็นล่าสุด</Stencil>
                    <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                      {[...activeResponses].reverse().slice(0, 8).map(r => (
                        <div key={r.responseId} className="px-3 py-2 rounded-lg text-[12px]"
                          style={{ background: T.surfaceLight, color: T.fg1 }}>
                          <span className="font-mono text-[10px] mr-2" style={{ color: T.fg3 }}>{r.studentAlias}</span>
                          {r.answerText}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ) : (
              <Card padding={24} className="flex flex-col items-center gap-3">
                <MIcon name="hourglass_empty" size={40} color={T.fg3} />
                <p style={{ color: T.fg3 }}>ยังไม่มีคำถาม</p>
              </Card>
            )}

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'ตอบแล้ว',   value: activeResponses.length, color: T.success },
                { label: 'คนทั้งหมด', value: totalResponders,         color: T.fg1 },
                { label: '% ตอบ',     value: `${respPct}%`,          color: T.primary },
              ].map(s => (
                <Card key={s.label} padding={14} className="flex flex-col items-center">
                  <Stencil>{s.label}</Stencil>
                  <span className="text-[36px] font-bold mt-1 leading-none" style={{ color: s.color }}>{s.value}</span>
                </Card>
              ))}
            </div>
          </div>

          {/* Right: bubble cloud + QR */}
          <div className="xl:col-span-1 flex flex-col gap-4">
            {activeQ?.type === 'openText' && clusters.length > 0 ? (
              <Card padding={16}>
                <div className="flex items-center justify-between mb-2">
                  <Stencil color={T.accentPurple}>Theme Clusters</Stencil>
                  <span className="text-[10px]" style={{ color: T.fg3 }}>{clusters.length} themes</span>
                </div>
                <BubbleCloud clusters={clusters} selected={selectedCluster} onSelect={setSelectedCluster} />
                <div className="flex flex-col gap-2 mt-3">
                  {clusters.map(cl => {
                    const color  = CAT_COLOR[cl.category] ?? T.accentPurple
                    const active = selectedCluster?.clusterId === cl.clusterId
                    const issued = issuedIds.has(cl.clusterId)
                    return (
                      <div key={cl.clusterId}
                        onClick={() => setSelectedCluster(active ? null : cl)}
                        className="p-2.5 rounded-xl cursor-pointer hover:bg-white/5 transition-colors"
                        style={{ background: active ? color + '18' : T.surfaceLight, border: `1px solid ${active ? color + '60' : T.border}` }}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-[12px] font-semibold truncate" style={{ color: T.fg1 }}>{cl.themeTitle}</p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {issued && <MIcon name="check_circle" size={12} color={T.success} fill={1} />}
                            <span className="text-[11px] font-bold" style={{ color }}>{cl.percentage}%</span>
                          </div>
                        </div>
                        <p className="text-[10px] mt-0.5" style={{ color: T.fg3 }}>{cl.count} คน · {cl.category}</p>
                      </div>
                    )
                  })}
                </div>
                {selectedCluster && (
                  <div className="mt-3">
                    <ClusterDetail
                      cluster={selectedCluster}
                      onCreateIssue={handleCreateIssue}
                      onClose={() => setSelectedCluster(null)}
                      issuedIds={issuedIds}
                    />
                  </div>
                )}
              </Card>
            ) : (
              <Card padding={16}>
                <Stencil color={T.fg3} className="mb-2">Theme Clusters</Stencil>
                <p className="text-[12px]" style={{ color: T.fg3 }}>
                  {activeQ?.type === 'openText' ? 'รอคำตอบจากผู้เรียน...' : 'เปิดเมื่อเลือกคำถาม Open Text'}
                </p>
              </Card>
            )}

            <Card padding={16} className="flex flex-col items-center gap-3">
              <Stencil color={T.fg3}>Student Join</Stencil>
              <QRCodeSVG value={joinUrl} size={130} bgColor={T.card} fgColor={T.fg1} level="H" />
              <span className="font-mono font-bold tracking-[5px]" style={{ fontSize: 20, color: T.primary }}>
                {session?.joinCode}
              </span>
              <p className="text-[10px] text-center break-all" style={{ color: T.fg3 }}>{joinUrl}</p>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
