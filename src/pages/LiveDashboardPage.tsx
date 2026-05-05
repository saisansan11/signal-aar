import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts'
import { QRCodeSVG } from 'qrcode.react'
import { T } from '../tokens'
import { Card, Stencil, MIcon, HUDGrid, Chip, LivePulse, StatusBadge, GhostBtn, PrimaryBtn } from '../components/ui'
import { subscribeToSession, updateSessionStatus } from '../services/liveSessionService'
import { subscribeToQuestions, setActiveQuestion } from '../services/questionService'
import { subscribeToResponses, subscribeToAllSessionResponses } from '../services/responseService'
import { clusterResponses } from '../services/themeClusteringService'
import { createIssue } from '../services/issueService'
import { seedDemoData, USE_MOCK } from '../services'
import type { LiveSession, Question, Response, ThemeCluster } from '../models'
import { countOptionResponses, averageRating } from '../utils/percentages'

// Re-export USE_MOCK from the barrel so the import above works
// (barrel created below)

const COLORS = [T.primary, T.accentBlue, T.success, T.es, T.ep, T.ea, T.spectrum, T.radar]

const CAT_COLOR: Record<string, string> = {
  equipment: T.error, time: T.warning, instructor: T.es,
  content: T.info, practice: T.spectrum, assessment: T.ep,
  location: T.drone, safety: T.radar, other: T.fg3,
}

function clusterToIssueCategory(cat: string) {
  return cat === 'equipment' ? 'EQUIP'
    : cat === 'time'       ? 'TIME'
    : cat === 'instructor' ? 'INSTR'
    : cat === 'content'    ? 'DOC'
    : cat === 'practice'   ? 'CURR'
    : cat === 'assessment' ? 'ASSESS'
    : 'OTHER'
}

// ── Bubble Cloud component ────────────────────────────────────────
function BubbleCloud({
  clusters,
  selected,
  onSelect,
}: {
  clusters: ThemeCluster[]
  selected: ThemeCluster | null
  onSelect: (cl: ThemeCluster | null) => void
}) {
  if (!clusters.length) return null
  const max = Math.max(...clusters.map(c => c.count), 1)

  return (
    <div className="relative flex flex-wrap gap-3 justify-center py-2 min-h-[120px] items-center">
      {clusters.map((cl, i) => {
        const ratio  = cl.count / max
        const size   = Math.round(56 + ratio * 72)        // 56–128 px
        const fs     = Math.round(9 + ratio * 8)           // 9–17 px
        const active = selected?.clusterId === cl.clusterId
        const color  = CAT_COLOR[cl.category] ?? T.accentPurple
        return (
          <button
            key={cl.clusterId}
            type="button"
            onClick={() => onSelect(active ? null : cl)}
            title={`${cl.themeTitle} — ${cl.count} คน (${cl.percentage}%)`}
            className="rounded-full flex flex-col items-center justify-center font-semibold transition-all duration-300 hover:scale-110 animate-bubble-in"
            style={{
              width: size, height: size,
              fontSize: fs,
              lineHeight: 1.2,
              background: active ? color : color + '28',
              color: active ? '#0D1117' : color,
              border: `2px solid ${color}${active ? 'FF' : '70'}`,
              boxShadow: active ? `0 0 20px ${color}60` : `0 2px 8px rgba(0,0,0,.3)`,
              animationDelay: `${i * 60}ms`,
              flexShrink: 0,
            }}
          >
            <span className="leading-none font-bold">{cl.percentage}%</span>
            <span className="leading-none opacity-80 mt-0.5" style={{ fontSize: Math.max(7, fs - 3) }}>
              {cl.count} คน
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Cluster detail panel ──────────────────────────────────────────
function ClusterDetail({
  cluster,
  onCreateIssue,
  onClose,
  issuedIds,
}: {
  cluster: ThemeCluster
  onCreateIssue: (cl: ThemeCluster) => Promise<void>
  onClose: () => void
  issuedIds: Set<string>
}) {
  const [busy, setBusy] = useState(false)
  const color = CAT_COLOR[cluster.category] ?? T.accentPurple
  const alreadyIssued = issuedIds.has(cluster.clusterId)

  async function handle() {
    setBusy(true)
    await onCreateIssue(cluster)
    setBusy(false)
  }

  return (
    <div
      className="p-4 rounded-2xl flex flex-col gap-3 animate-bubble-in"
      style={{ background: T.surfaceLight, border: `1px solid ${color}50` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <Stencil color={color}>{cluster.category}</Stencil>
          <p className="mt-0.5 font-bold text-[14px]" style={{ color: T.fg1 }}>{cluster.themeTitle}</p>
          <p className="text-[11px]" style={{ color: T.fg3 }}>
            {cluster.count} คน · {cluster.percentage}%
          </p>
        </div>
        <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-white/10">
          <MIcon name="close" size={16} color={T.fg3} />
        </button>
      </div>

      {/* Quotes */}
      <div className="flex flex-col gap-1.5">
        {cluster.representativeComments.map((c, i) => (
          <p
            key={i}
            className="text-[11px] py-1.5 px-2 rounded-lg"
            style={{
              color: T.fg2,
              background: T.card,
              borderLeft: `3px solid ${color}80`,
            }}
          >
            "{c}"
          </p>
        ))}
      </div>

      {/* Keywords */}
      <div className="flex flex-wrap gap-1">
        {cluster.keywords.slice(0, 5).map(kw => (
          <span
            key={kw}
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: color + '20', color }}
          >
            {kw}
          </span>
        ))}
      </div>

      {/* Create issue */}
      {alreadyIssued ? (
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: T.success }}>
          <MIcon name="check_circle" size={14} color={T.success} fill={1} />
          สร้าง Issue แล้ว
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={handle}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all hover:opacity-80 disabled:opacity-40"
          style={{ background: T.error + '20', color: T.error, border: `1px solid ${T.error}50` }}
        >
          <MIcon name="add_circle" size={14} color={T.error} fill={1} />
          {busy ? 'กำลังสร้าง...' : 'สร้าง Issue จาก Theme นี้'}
        </button>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────
export default function LiveDashboardPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const nav = useNavigate()

  const [session,         setSession]         = useState<LiveSession | null>(null)
  const [questions,       setQuestions]       = useState<Question[]>([])
  const [allResponses,    setAllResponses]    = useState<Response[]>([])
  const [activeResponses, setActiveResponses] = useState<Response[]>([])
  const [clusters,        setClusters]        = useState<ThemeCluster[]>([])
  const [selectedCluster, setSelectedCluster] = useState<ThemeCluster | null>(null)
  const [issuedClusterIds, setIssuedClusterIds] = useState<Set<string>>(new Set())
  const [showQR,          setShowQR]          = useState(false)
  const [presMode,        setPresMode]        = useState(false)
  const [seedBusy,        setSeedBusy]        = useState(false)
  const [seedMsg,         setSeedMsg]         = useState('')
  const pageRef = useRef<HTMLDivElement>(null)

  // ── subscriptions ──────────────────────────────────────────────
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
      if (activeQ.type === 'openText') setClusters(clusterResponses(rs, sessionId, activeQ.questionId))
      else setClusters([])
    })
    return u
  }, [sessionId, activeQ?.questionId])

  // ── actions ───────────────────────────────────────────────────
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

  async function handleCreateIssueFromCluster(cluster: ThemeCluster) {
    if (!session) return
    await createIssue({
      courseId:        session.courseId,
      batchId:         session.batchId,
      sourceSessionId: session.sessionId,
      sourceQuestionId: cluster.questionId,
      sourceClusterId: cluster.clusterId,
      title:           cluster.themeTitle,
      category:        clusterToIssueCategory(cluster.category),
      severity:        cluster.percentage >= 30 ? 'P1' : cluster.percentage >= 20 ? 'P2' : 'P3',
      frequencyCount:  cluster.count,
      percentage:      cluster.percentage,
      status:          'open',
    })
    setIssuedClusterIds(s => new Set([...s, cluster.clusterId]))
  }

  async function handleSeed() {
    setSeedBusy(true)
    setSeedMsg('')
    const { created, skipped } = await seedDemoData()
    setSeedMsg(`✅ Seeded: ${created.join(', ')} ${skipped.length ? `| ⏭ Skipped: ${skipped.join(', ')}` : ''}`)
    setSeedBusy(false)
  }

  // ── fullscreen ────────────────────────────────────────────────
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      pageRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  // ── derived ───────────────────────────────────────────────────
  const totalResponders = new Set(allResponses.map(r => r.studentAlias)).size
  const joinUrl  = `${window.location.origin}/join/${session?.joinCode}`
  const chartData = activeQ && (activeQ.type === 'multipleChoice' || activeQ.type === 'yesNo')
    ? countOptionResponses(activeResponses, activeQ.options)
    : []
  const avgRating = activeQ?.type === 'rating' ? averageRating(activeResponses) : null
  const respPct   = totalResponders > 0 ? Math.round((activeResponses.length / totalResponders) * 100) : 0

  // ── presentation layout ───────────────────────────────────────
  if (presMode) {
    return (
      <div
        ref={pageRef}
        className="relative flex flex-col min-h-screen overflow-auto"
        style={{ background: T.bg }}
      >
        <HUDGrid opacity={0.04} />

        {/* Pres top bar */}
        <header
          className="relative flex items-center justify-between px-8 py-4 border-b"
          style={{ borderColor: T.border, background: T.surface }}
        >
          <div className="flex items-center gap-4">
            {session?.status === 'active' && <LivePulse />}
            <div>
              <p className="text-[11px] font-mono" style={{ color: T.fg3 }}>
                {session?.joinCode} · {session?.title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Chip color={T.accentBlue} icon="group">{totalResponders} คน</Chip>
            <Chip color={T.success} icon="done">{activeResponses.length} ตอบ</Chip>
            <GhostBtn onClick={() => setShowQR(true)} icon="qr_code" size="sm">QR</GhostBtn>
            <GhostBtn onClick={toggleFullscreen} icon="fullscreen" size="sm">Fullscreen</GhostBtn>
            <GhostBtn onClick={() => setPresMode(false)} icon="close" size="sm">ออก</GhostBtn>
          </div>
        </header>

        {/* Main pres area */}
        <div className="relative flex-1 flex flex-col items-center justify-center px-12 py-8 gap-8">
          {activeQ && (
            <>
              {/* Question text */}
              <div className="text-center max-w-4xl">
                <p className="text-[13px] font-mono mb-3" style={{ color: T.primary }}>
                  Q{questions.findIndex(q => q.questionId === activeQ.questionId) + 1} / {questions.length}
                </p>
                <p className="text-[32px] font-bold leading-snug" style={{ color: T.fg1 }}>
                  {activeQ.text}
                </p>
              </div>

              {/* Big chart */}
              {chartData.length > 0 && (
                <div className="w-full max-w-3xl">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData} layout="vertical" margin={{ left: 16, right: 80, top: 0, bottom: 0 }}>
                      <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: T.fg3, fontSize: 13 }} />
                      <YAxis type="category" dataKey="option" tick={{ fill: T.fg2, fontSize: 15 }} width={220} />
                      <Bar dataKey="pct" radius={[0, 6, 6, 0]} label={{ position: 'right', formatter: (v: unknown) => `${typeof v === 'number' ? v : 0}%`, fill: T.fg1, fontSize: 14, fontWeight: 700 }}>
                        {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Big rating */}
              {avgRating !== null && (
                <div className="flex flex-col items-center gap-3">
                  <span className="text-[96px] font-bold tracking-tight leading-none" style={{ color: T.primary }}>
                    {avgRating.toFixed(1)}
                  </span>
                  <div className="flex gap-3">
                    {[1, 2, 3, 4, 5].map(n => (
                      <span key={n} className="text-[40px]" style={{ color: n <= Math.round(avgRating) ? T.primary : T.fg3 }}>★</span>
                    ))}
                  </div>
                  <p className="text-[18px]" style={{ color: T.fg2 }}>คะแนนเฉลี่ย (จาก 5) · {activeResponses.length} คนตอบ</p>
                </div>
              )}

              {/* Open text: bubble cloud big */}
              {activeQ.type === 'openText' && clusters.length > 0 && (
                <div className="w-full max-w-3xl">
                  <BubbleCloud clusters={clusters} selected={selectedCluster} onSelect={setSelectedCluster} />
                </div>
              )}
            </>
          )}

          {/* Pres counter strip */}
          <div className="flex gap-8 mt-4">
            {[
              { label: 'ตอบแล้ว', value: activeResponses.length, color: T.success },
              { label: 'คนทั้งหมด', value: totalResponders, color: T.fg1 },
              { label: '% ตอบ', value: `${respPct}%`, color: T.primary },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center gap-1">
                <span className="text-[56px] font-bold leading-none" style={{ color: s.color }}>{s.value}</span>
                <Stencil color={T.fg3}>{s.label}</Stencil>
              </div>
            ))}
          </div>
        </div>

        {/* Pres QR bottom right */}
        <div
          className="absolute bottom-6 right-8 flex flex-col items-center gap-2 p-3 rounded-2xl"
          style={{ background: T.surface, border: `1px solid ${T.border}` }}
        >
          <QRCodeSVG value={joinUrl} size={100} bgColor={T.surface} fgColor={T.fg1} />
          <span className="font-mono text-[16px] font-bold tracking-[4px]" style={{ color: T.primary }}>{session?.joinCode}</span>
        </div>
      </div>
    )
  }

  // ── normal layout ─────────────────────────────────────────────
  return (
    <div ref={pageRef} className="relative min-h-screen" style={{ background: T.bg }}>
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

          {/* Seed button — visible only in dev/mock */}
          {USE_MOCK && (
            <button
              type="button"
              onClick={handleSeed}
              disabled={seedBusy}
              className="px-2 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity disabled:opacity-40"
              style={{ background: T.accentBlue + '20', color: T.accentBlue, border: `1px solid ${T.accentBlue}40` }}
            >
              <MIcon name="science" size={13} color={T.accentBlue} />
              {seedBusy ? 'Seeding...' : 'Seed Demo'}
            </button>
          )}
          {seedMsg && <span className="text-[10px] max-w-xs truncate" style={{ color: T.success }}>{seedMsg}</span>}

          <GhostBtn onClick={() => setShowQR(!showQR)} icon="qr_code" size="sm">QR</GhostBtn>
          <GhostBtn onClick={() => setPresMode(true)} icon="present_to_all" size="sm">Pres</GhostBtn>
          <GhostBtn onClick={toggleFullscreen} icon="fullscreen" size="sm">Full</GhostBtn>

          {session?.status === 'active' && (
            <button
              type="button"
              onClick={closeSession}
              className="px-3 py-1.5 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 hover:opacity-80"
              style={{ background: T.error + '20', color: T.error, border: `1px solid ${T.error}40` }}
            >
              <MIcon name="stop_circle" size={14} color={T.error} />
              ปิด Session
            </button>
          )}
          {session?.status === 'draft' && (
            <PrimaryBtn
              onClick={() => sessionId && updateSessionStatus(sessionId, 'active', activeQ?.questionId ?? null)}
              icon="play_arrow" size="sm"
            >
              เริ่ม Session
            </PrimaryBtn>
          )}
        </div>
      </header>

      {/* QR overlay */}
      {showQR && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setShowQR(false)}
        >
          <Card padding={32} className="flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <Stencil color={T.primary}>Join Code</Stencil>
            <span className="font-mono text-[40px] font-bold tracking-[10px]" style={{ color: T.primary }}>
              {session?.joinCode}
            </span>
            <QRCodeSVG value={joinUrl} size={220} bgColor={T.card} fgColor={T.fg1} />
            <p className="text-[11px]" style={{ color: T.fg3 }}>{joinUrl}</p>
            <GhostBtn onClick={() => setShowQR(false)} icon="close">ปิด</GhostBtn>
          </Card>
        </div>
      )}

      {/* Body grid */}
      <div className="relative p-4 grid grid-cols-1 xl:grid-cols-4 gap-4">

        {/* ── Left: question list ─────────────────────────────── */}
        <div className="xl:col-span-1">
          <Card padding={14}>
            <Stencil color={T.primary} className="mb-3">คำถาม ({questions.length})</Stencil>
            <div className="flex flex-col gap-2">
              {questions.map((q, i) => {
                const isActive = q.questionId === (session?.currentQuestionId ?? questions[0]?.questionId)
                const cnt = allResponses.filter(r => r.questionId === q.questionId).length
                return (
                  <div
                    key={q.questionId}
                    onClick={() => session?.status === 'active' && activateQuestion(q.questionId)}
                    className="p-3 rounded-xl cursor-pointer transition-all hover:bg-white/5"
                    style={{
                      background: isActive ? T.primary + '18' : T.surfaceLight,
                      border: `1px solid ${isActive ? T.primary + '60' : T.border}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px]" style={{ color: isActive ? T.primary : T.fg3 }}>Q{i + 1}</span>
                      <span className="text-[10px]" style={{ color: T.fg3 }}>{cnt} ✓</span>
                    </div>
                    <p className="text-[12px] line-clamp-2" style={{ color: isActive ? T.fg1 : T.fg2 }}>
                      {q.text || '(ยังไม่ระบุ)'}
                    </p>
                    <p className="text-[10px] mt-0.5 capitalize" style={{ color: isActive ? T.primary + '99' : T.fg3 }}>
                      {q.type}
                    </p>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* ── Center: main display ────────────────────────────── */}
        <div className="xl:col-span-2 flex flex-col gap-4">

          {/* Current question card */}
          {activeQ ? (
            <Card accent={T.primary + '50'} glow={session?.status === 'active' ? T.primary : undefined}>
              <div className="flex items-center gap-2 mb-3">
                <Stencil color={T.primary}>คำถามปัจจุบัน</Stencil>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase"
                  style={{ background: T.accentBlue + '20', color: T.accentBlue }}
                >
                  {activeQ.type}
                </span>
              </div>
              <p className="text-[17px] font-semibold mb-5 leading-snug" style={{ color: T.fg1 }}>{activeQ.text}</p>

              {/* Choice bar chart */}
              {chartData.length > 0 && (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 48, top: 0, bottom: 0 }}>
                      <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: T.fg3, fontSize: 11 }} />
                      <YAxis type="category" dataKey="option" tick={{ fill: T.fg2, fontSize: 12 }} width={170} />
                      <Bar dataKey="pct" radius={[0, 4, 4, 0]}
                        label={{ position: 'right', formatter: (v: unknown) => `${typeof v === 'number' ? v : 0}%`, fill: T.fg1, fontSize: 12, fontWeight: 600 }}
                      >
                        {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-2 flex gap-3 flex-wrap">
                    {chartData.map((d, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-[11px]" style={{ color: T.fg2 }}>{d.option}</span>
                        <span className="text-[11px] font-bold" style={{ color: T.fg1 }}>{d.count} คน</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Rating big display */}
              {avgRating !== null && (
                <div className="flex flex-col items-center py-6">
                  <span className="text-[64px] font-bold tracking-tight leading-none" style={{ color: T.primary }}>
                    {avgRating.toFixed(1)}
                  </span>
                  <div className="flex gap-2 mt-3">
                    {[1, 2, 3, 4, 5].map(n => (
                      <span key={n} className="text-[28px] transition-colors" style={{ color: n <= Math.round(avgRating) ? T.primary : T.surfaceLight }}>★</span>
                    ))}
                  </div>
                  <p className="text-[13px] mt-2" style={{ color: T.fg2 }}>
                    คะแนนเฉลี่ย · {activeResponses.length} คนตอบ
                  </p>
                </div>
              )}

              {/* Open text: live feed */}
              {activeQ.type === 'openText' && activeResponses.length > 0 && (
                <div className="mt-2">
                  <Stencil color={T.fg3} className="mb-2">ความคิดเห็นล่าสุด</Stencil>
                  <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                    {[...activeResponses].reverse().slice(0, 8).map(r => (
                      <div
                        key={r.responseId}
                        className="px-3 py-2 rounded-lg text-[12px]"
                        style={{ background: T.surfaceLight, color: T.fg1 }}
                      >
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
              <p style={{ color: T.fg3 }}>ยังไม่มีคำถาม — สร้าง Session ก่อน</p>
            </Card>
          )}

          {/* Response counter strip */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'ตอบแล้ว',    value: activeResponses.length, color: T.success },
              { label: 'คนทั้งหมด',  value: totalResponders,        color: T.fg1 },
              { label: '% ตอบ',      value: `${respPct}%`,          color: T.primary },
            ].map(s => (
              <Card key={s.label} padding={14} className="flex flex-col items-center">
                <Stencil>{s.label}</Stencil>
                <span className="text-[36px] font-bold mt-1 leading-none" style={{ color: s.color }}>{s.value}</span>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Right: Theme Bubble Cloud ───────────────────────── */}
        <div className="xl:col-span-1 flex flex-col gap-4">
          {activeQ?.type === 'openText' && clusters.length > 0 ? (
            <Card padding={16}>
              <div className="flex items-center justify-between mb-3">
                <Stencil color={T.accentPurple}>Theme Clusters</Stencil>
                <span className="text-[10px]" style={{ color: T.fg3 }}>{clusters.length} themes</span>
              </div>

              {/* Bubble cloud */}
              <BubbleCloud
                clusters={clusters}
                selected={selectedCluster}
                onSelect={setSelectedCluster}
              />

              {/* Cluster list */}
              <div className="flex flex-col gap-2 mt-3">
                {clusters.map(cl => {
                  const color   = CAT_COLOR[cl.category] ?? T.accentPurple
                  const active  = selectedCluster?.clusterId === cl.clusterId
                  const issued  = issuedClusterIds.has(cl.clusterId)
                  return (
                    <div
                      key={cl.clusterId}
                      onClick={() => setSelectedCluster(active ? null : cl)}
                      className="p-2.5 rounded-xl cursor-pointer hover:bg-white/5 transition-colors"
                      style={{
                        background: active ? color + '18' : T.surfaceLight,
                        border: `1px solid ${active ? color + '60' : T.border}`,
                      }}
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

              {/* Selected cluster detail */}
              {selectedCluster && (
                <div className="mt-3">
                  <ClusterDetail
                    cluster={selectedCluster}
                    onCreateIssue={handleCreateIssueFromCluster}
                    onClose={() => setSelectedCluster(null)}
                    issuedIds={issuedClusterIds}
                  />
                </div>
              )}
            </Card>
          ) : (
            <Card padding={16}>
              <Stencil color={T.fg3} className="mb-2">Theme Clusters</Stencil>
              <p className="text-[12px]" style={{ color: T.fg3 }}>
                {activeQ?.type === 'openText'
                  ? 'รอคำตอบจากผู้เรียน...'
                  : 'เปิดใช้งานเมื่อเลือกคำถาม Open Text'}
              </p>
            </Card>
          )}

          {/* QR mini card */}
          <Card padding={16} className="flex flex-col items-center gap-3">
            <Stencil color={T.fg3}>Student Join</Stencil>
            <QRCodeSVG value={joinUrl} size={130} bgColor={T.card} fgColor={T.fg1} />
            <span className="font-mono text-[20px] font-bold tracking-[5px]" style={{ color: T.primary }}>
              {session?.joinCode}
            </span>
            <p className="text-[10px] text-center break-all" style={{ color: T.fg3 }}>{joinUrl}</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
