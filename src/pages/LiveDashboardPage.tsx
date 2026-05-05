import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts'
import { QRCodeSVG } from 'qrcode.react'
import { T } from '../tokens'
import { Card, Stencil, MIcon, HUDGrid, Chip, LivePulse, StatusBadge, GhostBtn } from '../components/ui'
import { subscribeToSession, updateSessionStatus } from '../services/liveSessionService'
import { subscribeToQuestions, setActiveQuestion } from '../services/questionService'
import { subscribeToResponses, subscribeToAllSessionResponses } from '../services/responseService'
import { clusterResponses } from '../services/themeClusteringService'
import { createIssue } from '../services/issueService'
import type { LiveSession, Question, Response, ThemeCluster } from '../models'
import { countOptionResponses, averageRating } from '../utils/percentages'

const COLORS = [T.primary, T.accentBlue, T.success, T.es, T.ep, T.ea, T.spectrum, T.radar]

export default function LiveDashboardPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const nav = useNavigate()
  const [session, setSession] = useState<LiveSession | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [allResponses, setAllResponses] = useState<Response[]>([])
  const [activeResponses, setActiveResponses] = useState<Response[]>([])
  const [clusters, setClusters] = useState<ThemeCluster[]>([])
  const [selectedCluster, setSelectedCluster] = useState<ThemeCluster | null>(null)
  const [showQR, setShowQR] = useState(false)


  useEffect(() => {
    if (!sessionId) return
    const unsub1 = subscribeToSession(sessionId, setSession)
    const unsub2 = subscribeToQuestions(sessionId, setQuestions)
    const unsub3 = subscribeToAllSessionResponses(sessionId, setAllResponses)
    return () => { unsub1(); unsub2(); unsub3() }
  }, [sessionId])

  const activeQ = questions.find(q => q.questionId === session?.currentQuestionId) ?? questions[0]

  useEffect(() => {
    if (!sessionId || !activeQ) return
    const unsub = subscribeToResponses(sessionId, activeQ.questionId, rs => {
      setActiveResponses(rs)
      if (activeQ.type === 'openText') {
        setClusters(clusterResponses(rs, sessionId, activeQ.questionId))
      }
    })
    return unsub
  }, [sessionId, activeQ?.questionId])

  async function activateQuestion(qId: string) {
    if (!sessionId) return
    await setActiveQuestion(activeQ?.questionId ?? '', false)
    await setActiveQuestion(qId, true)
    await updateSessionStatus(sessionId, 'active', qId)
  }

  async function closeSession() {
    if (!sessionId) return
    await updateSessionStatus(sessionId, 'closed')
    nav('/sessions')
  }

  async function createIssueFromCluster(cluster: ThemeCluster) {
    if (!session) return
    await createIssue({
      courseId: session.courseId,
      batchId: session.batchId,
      sourceSessionId: session.sessionId,
      sourceQuestionId: cluster.questionId,
      sourceClusterId: cluster.clusterId,
      title: cluster.themeTitle,
      category: cluster.category === 'equipment' ? 'EQUIP'
        : cluster.category === 'time' ? 'TIME'
        : cluster.category === 'instructor' ? 'INSTR'
        : cluster.category === 'content' ? 'DOC'
        : cluster.category === 'practice' ? 'CURR'
        : cluster.category === 'assessment' ? 'ASSESS'
        : 'OTHER',
      severity: cluster.percentage >= 30 ? 'P1' : cluster.percentage >= 20 ? 'P2' : 'P3',
      frequencyCount: cluster.count,
      percentage: cluster.percentage,
      status: 'open',
    })
    alert(`สร้าง Issue จาก Theme "${cluster.themeTitle}" เรียบร้อยแล้ว`)
  }

  const totalResponders = new Set(allResponses.map(r => r.studentAlias)).size
  const joinUrl = `${window.location.origin}/join/${session?.joinCode}`

  const chartData = activeQ && (activeQ.type === 'multipleChoice' || activeQ.type === 'yesNo')
    ? countOptionResponses(activeResponses, activeQ.options)
    : []
  const avgRating = activeQ?.type === 'rating' ? averageRating(activeResponses) : null

  return (
    <div className="relative min-h-screen" style={{ background: T.bg }}>
      <HUDGrid opacity={0.03} />

      {/* Top bar */}
      <header className="relative flex items-center gap-4 px-6 py-3 border-b" style={{ borderColor: T.border, background: T.surface }}>
        <button onClick={() => nav('/sessions')} className="p-1.5 rounded-lg hover:bg-white/5">
          <MIcon name="arrow_back" size={18} color={T.fg2} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-mono" style={{ color: T.fg3 }}>{session?.joinCode}</p>
          <p className="text-[15px] font-bold truncate" style={{ color: T.fg1 }}>{session?.title}</p>
        </div>
        <div className="flex items-center gap-3">
          {session?.status === 'active' && <LivePulse />}
          <StatusBadge status={session?.status ?? 'draft'} />
          <Chip color={T.accentBlue} icon="group">{totalResponders} คน</Chip>
          <GhostBtn onClick={() => setShowQR(!showQR)} icon="qr_code" size="sm">QR Code</GhostBtn>
          {session?.status === 'active' && (
            <button
              onClick={closeSession}
              className="px-3 py-1.5 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 hover:opacity-80 transition-opacity"
              style={{ background: T.error + '20', color: T.error, border: `1px solid ${T.error}40` }}
            >
              <MIcon name="stop_circle" size={14} color={T.error} />
              ปิด Session
            </button>
          )}
        </div>
      </header>

      {/* QR overlay */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <Card padding={32} className="flex flex-col items-center gap-4">
            <Stencil color={T.primary}>Join Code</Stencil>
            <span className="font-mono text-[36px] font-bold tracking-[8px]" style={{ color: T.primary }}>{session?.joinCode}</span>
            <QRCodeSVG value={joinUrl} size={200} bgColor={T.card} fgColor={T.fg1} />
            <p className="text-[12px]" style={{ color: T.fg3 }}>{joinUrl}</p>
            <GhostBtn onClick={() => setShowQR(false)} icon="close">ปิด</GhostBtn>
          </Card>
        </div>
      )}

      <div className="relative p-6 grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left: question list */}
        <div className="xl:col-span-1">
          <Card padding={16}>
            <Stencil color={T.primary} className="mb-3">คำถาม ({questions.length})</Stencil>
            <div className="flex flex-col gap-2">
              {questions.map((q, i) => {
                const isActive = q.questionId === session?.currentQuestionId
                const qResps = allResponses.filter(r => r.questionId === q.questionId)
                return (
                  <div
                    key={q.questionId}
                    onClick={() => session?.status === 'active' && activateQuestion(q.questionId)}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${isActive ? '' : 'hover:bg-white/5'}`}
                    style={{
                      background: isActive ? T.primary + '15' : T.surfaceLight,
                      border: `1px solid ${isActive ? T.primary + '60' : T.border}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px]" style={{ color: isActive ? T.primary : T.fg3 }}>Q{i + 1}</span>
                      <span className="text-[10px]" style={{ color: T.fg3 }}>{qResps.length} ตอบ</span>
                    </div>
                    <p className="text-[12px] line-clamp-2" style={{ color: isActive ? T.fg1 : T.fg2 }}>{q.text || '(ยังไม่ตั้งชื่อ)'}</p>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Center: main display */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          {/* Current question */}
          {activeQ && (
            <Card accent={T.primary + '40'}>
              <div className="flex items-center gap-2 mb-4">
                <Stencil color={T.primary}>คำถามปัจจุบัน</Stencil>
                <Chip color={T.accentBlue} size={10}>{activeQ.type}</Chip>
              </div>
              <p className="text-[18px] font-semibold mb-6" style={{ color: T.fg1 }}>{activeQ.text}</p>

              {/* Choice chart */}
              {chartData.length > 0 && (
                <div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 32, top: 0, bottom: 0 }}>
                      <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: T.fg3, fontSize: 11 }} />
                      <YAxis type="category" dataKey="option" tick={{ fill: T.fg2, fontSize: 12 }} width={160} />
                      <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                        {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-2 flex gap-4 flex-wrap">
                    {chartData.map((d, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-[11px]" style={{ color: T.fg2 }}>{d.option}</span>
                        <span className="text-[11px] font-bold" style={{ color: T.fg1 }}>{d.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rating */}
              {avgRating !== null && (
                <div className="flex flex-col items-center py-4">
                  <span className="text-[56px] font-bold tracking-tight" style={{ color: T.primary }}>{avgRating.toFixed(1)}</span>
                  <span className="text-[14px]" style={{ color: T.fg2 }}>คะแนนเฉลี่ย (จาก 5)</span>
                  <div className="flex gap-2 mt-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <span key={n} className="text-[24px]" style={{ color: n <= Math.round(avgRating) ? T.primary : T.fg3 }}>★</span>
                    ))}
                  </div>
                  <p className="text-[12px] mt-1" style={{ color: T.fg3 }}>{activeResponses.length} คนตอบ</p>
                </div>
              )}

              {/* Open text live feed */}
              {activeQ.type === 'openText' && activeResponses.length > 0 && (
                <div className="mt-2">
                  <Stencil color={T.fg3} className="mb-2">ความคิดเห็นล่าสุด</Stencil>
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                    {activeResponses.slice(-8).reverse().map(r => (
                      <div key={r.responseId} className="p-2.5 rounded-lg text-[12px]" style={{ background: T.surfaceLight, color: T.fg1 }}>
                        <span className="font-mono text-[10px] mr-2" style={{ color: T.fg3 }}>{r.studentAlias}</span>
                        {r.answerText}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Response count */}
          <div className="grid grid-cols-3 gap-4">
            <Card padding={16} className="flex flex-col items-center">
              <Stencil>ตอบแล้ว</Stencil>
              <span className="text-[36px] font-bold mt-1" style={{ color: T.success }}>{activeResponses.length}</span>
            </Card>
            <Card padding={16} className="flex flex-col items-center">
              <Stencil>คนทั้งหมด</Stencil>
              <span className="text-[36px] font-bold mt-1" style={{ color: T.fg1 }}>{totalResponders}</span>
            </Card>
            <Card padding={16} className="flex flex-col items-center">
              <Stencil>% ตอบ</Stencil>
              <span className="text-[36px] font-bold mt-1" style={{ color: T.primary }}>
                {totalResponders > 0 ? Math.round((activeResponses.length / totalResponders) * 100) : 0}%
              </span>
            </Card>
          </div>
        </div>

        {/* Right: Theme bubble cloud */}
        <div className="xl:col-span-1">
          {activeQ?.type === 'openText' && clusters.length > 0 ? (
            <Card padding={16}>
              <Stencil color={T.accentPurple} className="mb-3">AI Theme Clusters</Stencil>
              <div className="flex flex-wrap gap-2 mb-4">
                {clusters.map(cl => {
                  const sz = Math.max(28, Math.min(72, 28 + cl.percentage * 1.2))
                  return (
                    <button
                      key={cl.clusterId}
                      onClick={() => setSelectedCluster(selectedCluster?.clusterId === cl.clusterId ? null : cl)}
                      className="rounded-full flex items-center justify-center font-semibold transition-all hover:scale-105 animate-bubble-in"
                      style={{
                        width: sz, height: sz, fontSize: Math.max(9, Math.min(13, sz / 5)),
                        background: selectedCluster?.clusterId === cl.clusterId ? T.accentPurple : T.accentPurple + '30',
                        color: selectedCluster?.clusterId === cl.clusterId ? '#0D1117' : T.accentPurple,
                        border: `2px solid ${T.accentPurple}60`,
                      }}
                      title={`${cl.themeTitle} (${cl.count} คน, ${cl.percentage}%)`}
                    >
                      {cl.percentage}%
                    </button>
                  )
                })}
              </div>

              {/* Cluster list */}
              <div className="flex flex-col gap-2">
                {clusters.map(cl => (
                  <div
                    key={cl.clusterId}
                    onClick={() => setSelectedCluster(selectedCluster?.clusterId === cl.clusterId ? null : cl)}
                    className="p-2.5 rounded-xl cursor-pointer hover:bg-white/5 transition-colors"
                    style={{
                      background: selectedCluster?.clusterId === cl.clusterId ? T.accentPurple + '15' : T.surfaceLight,
                      border: `1px solid ${selectedCluster?.clusterId === cl.clusterId ? T.accentPurple + '60' : T.border}`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] font-semibold" style={{ color: T.fg1 }}>{cl.themeTitle}</p>
                      <span className="text-[11px] font-bold" style={{ color: T.accentPurple }}>{cl.percentage}%</span>
                    </div>
                    <p className="text-[10px] mt-0.5" style={{ color: T.fg3 }}>{cl.count} คน · {cl.category}</p>
                    {cl.percentage >= 20 && (
                      <button
                        onClick={e => { e.stopPropagation(); createIssueFromCluster(cl) }}
                        className="mt-1.5 text-[10px] font-semibold flex items-center gap-1 hover:opacity-80"
                        style={{ color: T.error }}
                      >
                        <MIcon name="add_circle" size={12} color={T.error} /> สร้าง Issue
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Selected cluster quotes */}
              {selectedCluster && (
                <div className="mt-4 p-3 rounded-xl" style={{ background: T.surfaceLight, border: `1px solid ${T.accentPurple}40` }}>
                  <Stencil color={T.accentPurple} className="mb-2">{selectedCluster.themeTitle}</Stencil>
                  <div className="flex flex-col gap-1.5">
                    {selectedCluster.representativeComments.map((c, i) => (
                      <p key={i} className="text-[11px] pl-2" style={{ color: T.fg2, borderLeft: `2px solid ${T.accentPurple}60` }}>
                        "{c}"
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card padding={16}>
              <Stencil color={T.fg3} className="mb-3">Theme Analysis</Stencil>
              <p className="text-[12px]" style={{ color: T.fg3 }}>เปิดใช้งานเมื่อมีคำถามประเภท Open Text พร้อมคำตอบ</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
