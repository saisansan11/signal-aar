import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts'
import { QRCodeSVG } from 'qrcode.react'
import html2canvas from 'html2canvas'
import { T } from '../tokens'
import {
  Card, Stencil, MIcon, HUDGrid, Chip, LivePulse,
  StatusBadge, GhostBtn, PrimaryBtn, CornerBrackets,
} from '../components/ui'
import { subscribeToSession, updateSessionStatus } from '../services/liveSessionService'
import { subscribeToQuestions, setActiveQuestion } from '../services/questionService'
import { subscribeToResponses, subscribeToAllSessionResponses } from '../services/responseService'
import { clusterOpenTextResponses } from '../services/aiClusteringService'
import { clusterResponses } from '../services/themeClusteringService'
import { createIssue } from '../services/issueService'
import { seedDemoData, USE_MOCK } from '../services'
import type { LiveSession, Question, Response, ThemeCluster } from '../models'
import { countOptionResponses, averageRating } from '../utils/percentages'
import { useDebounce, useLocalStorage } from '../utils/hooks'

type ChoiceDatum = { option: string; count: number; pct: number }

// ─── constants ───────────────────────────────────────────────────
const CHART_COLORS = [T.primary, T.accentBlue, T.success, T.es, T.ep, T.ea, T.spectrum, T.radar]

const CAT_COLOR: Record<string, string> = {
  equipment: T.error, time: T.warning, instructor: T.es,
  content: T.info, practice: T.spectrum, assessment: T.ep,
  location: T.drone, safety: T.radar, other: T.fg3,
}

const CAT_ICON: Record<string, string> = {
  equipment: 'build', time: 'schedule', instructor: 'school',
  content: 'menu_book', practice: 'fitness_center', assessment: 'quiz',
  location: 'location_on', safety: 'shield', other: 'help',
}

const AUTO_ROTATE_MS = 15_000
const DECISION_TIMER_MS = 12_000
const INTERACTION_PAUSE_MS = 20_000

// Suggested corrective actions per category
const SUGGESTED_ACTIONS: Record<string, string[]> = {
  equipment:  ['จัดหาอุปกรณ์เพิ่มเติมตามจำนวนผู้รับการฝึก', 'ตรวจสอบและซ่อมบำรุงอุปกรณ์ก่อนการฝึก', 'จัดทำแผนสำรองหากอุปกรณ์ไม่เพียงพอ'],
  time:       ['เพิ่มชั่วโมงฝึกภาคปฏิบัติอีก 2 ชม./สัปดาห์', 'ปรับตารางสอนให้มีเวลาฝึกมากขึ้น', 'แบ่งกลุ่มย่อยเพื่อเพิ่มโอกาสฝึก'],
  instructor: ['ปรับความเร็วการสอนตาม feedback ผู้เรียน', 'เพิ่มตัวอย่างและสาธิตประกอบ', 'จัดการอบรมพัฒนาทักษะการสอนให้ครู'],
  content:    ['ปรับปรุงเอกสารประกอบการสอนให้ทันสมัย', 'เพิ่มตัวอย่างกรณีศึกษาจากสถานการณ์จริง', 'จัดทำ e-learning เสริม'],
  practice:   ['เพิ่มกิจกรรมภาคปฏิบัติในสนาม', 'จัดตั้ง simulator / lab เพิ่มเติม', 'ฝึกซ้อมแบบ scenario-based'],
  assessment: ['ทบทวนข้อสอบให้ครอบคลุม learning outcomes', 'เพิ่มการประเมินตลอดหลักสูตร (formative)', 'ปรับเกณฑ์การให้คะแนนให้โปร่งใส'],
  location:   ['ตรวจสอบสภาพห้อง/สถานที่ก่อนการฝึก', 'จัดเตรียมสถานที่สำรอง', 'ปรับปรุงสภาพแวดล้อมให้เอื้อต่อการเรียนรู้'],
  safety:     ['ทบทวนขั้นตอนความปลอดภัย', 'จัดทำ safety briefing ก่อนฝึกทุกครั้ง', 'ติดตั้งอุปกรณ์ความปลอดภัยเพิ่มเติม'],
  other:      ['รวบรวมรายละเอียดเพิ่มเติมจากผู้เรียน', 'นำ feedback ไปพิจารณาในการวางแผนครั้งต่อไป'],
}

function clusterToIssueCategory(cat: string) {
  const map: Record<string, string> = {
    equipment: 'EQUIP', time: 'TIME', instructor: 'INSTR',
    content: 'DOC', practice: 'CURR', assessment: 'ASSESS',
  }
  return map[cat] ?? 'OTHER'
}

// ─── useAnimatedNumber ───────────────────────────────────────────
// Triggers a flip animation whenever the value changes
function useAnimatedNumber(value: number) {
  const [key, setKey] = useState(0)
  const prev = useRef(value)
  useEffect(() => {
    if (value !== prev.current) { setKey(k => k + 1); prev.current = value }
  }, [value])
  return key
}

// ─── BubbleCloud ─────────────────────────────────────────────────
function BubbleCloud({
  clusters, selected, onSelect, large = false, focusId, animate = true,
}: {
  clusters: ThemeCluster[]
  selected: ThemeCluster | null
  onSelect: (cl: ThemeCluster | null) => void
  large?: boolean
  focusId?: string | null
  animate?: boolean
}) {
  const [pulseIds, setPulseIds] = useState<Set<string>>(new Set())
  const prevCounts = useRef<Record<string, number>>({})

  // detect which clusters grew → pulse them
  useEffect(() => {
    const newPulse: string[] = []
    clusters.forEach(cl => {
      if ((prevCounts.current[cl.clusterId] ?? 0) < cl.count) newPulse.push(cl.clusterId)
      prevCounts.current[cl.clusterId] = cl.count
    })
    if (newPulse.length) {
      setPulseIds(new Set(newPulse))
      const t = setTimeout(() => setPulseIds(new Set()), 600)
      return () => clearTimeout(t)
    }
  }, [clusters])

  if (!clusters.length) return null
  const max = Math.max(...clusters.map(c => c.count), 1)
  const baseMin = large ? 80 : 52
  const baseMax = large ? 160 : 110

  return (
    <div
      className="relative flex flex-wrap gap-4 justify-center items-center py-3"
      style={{ minHeight: large ? 220 : 140 }}
    >
      {clusters.map((cl, i) => {
        const ratio   = cl.count / max
        const size    = Math.round(baseMin + ratio * (baseMax - baseMin))
        const fs      = Math.round((large ? 11 : 9) + ratio * 6)
        const subFs   = Math.max(7, fs - 3)
        const active  = selected?.clusterId === cl.clusterId
        const focused = !active && cl.clusterId === focusId
        const pulsing = pulseIds.has(cl.clusterId)
        const color   = CAT_COLOR[cl.category] ?? T.accentPurple

        return (
          <button
            key={cl.clusterId}
            type="button"
            onClick={() => onSelect(active ? null : cl)}
            title={`${cl.themeTitle} — ${cl.count} คน (${cl.percentage}%)`}
            className={`relative rounded-full flex flex-col items-center justify-center font-semibold select-none ${animate && pulsing ? 'anim-bubble-pulse' : ''}`}
            style={{
              width: size, height: size,
              fontSize: fs, lineHeight: 1.25,
              background: active
                ? `radial-gradient(circle at 40% 35%, ${color}EE, ${color}AA)`
                : focused
                  ? `radial-gradient(circle at 40% 35%, ${color}60, ${color}30)`
                  : `radial-gradient(circle at 40% 35%, ${color}40, ${color}1A)`,
              color: active ? '#0D1117' : color,
              border: `2px solid ${color}${active ? 'FF' : focused ? 'CC' : '80'}`,
              boxShadow: active
                ? `0 0 28px ${color}90, inset 0 1px 0 rgba(255,255,255,.15)`
                : focused
                  ? `0 0 20px ${color}60, 0 0 0 3px ${color}30`
                  : '0 2px 8px rgba(0,0,0,.4)',
              transform: active ? 'scale(1.12)' : focused ? 'scale(1.06)' : 'scale(1)',
              transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
              flexShrink: 0,
              animationDelay: `${i * 50}ms`,
              zIndex: active ? 3 : focused ? 2 : 1,
            }}
          >
            {/* Outer ring for focused state */}
            {focused && (
              <span className="absolute inset-0 rounded-full animate-live-pulse"
                style={{ border: `2px solid ${color}60`, transform: 'scale(1.2)' }} />
            )}
            <span className="font-bold leading-none relative">{cl.percentage}%</span>
            <span className="leading-none opacity-80 relative" style={{ fontSize: subFs, marginTop: 2 }}>
              {cl.count} คน
            </span>
            {large && (
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-center font-semibold"
                style={{ fontSize: 10, color, maxWidth: 120 }}>
                {cl.themeTitle.length > 14 ? cl.themeTitle.slice(0, 13) + '…' : cl.themeTitle}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── InsightBanner ───────────────────────────────────────────────
function InsightBanner({ cluster, totalCount }: { cluster: ThemeCluster; totalCount: number }) {
  const color = CAT_COLOR[cluster.category] ?? T.primary
  const icon  = CAT_ICON[cluster.category] ?? 'lightbulb'
  return (
    <div
      className="relative overflow-hidden rounded-2xl flex items-start gap-3 px-4 py-3 anim-insight hud-scan"
      style={{
        background: `linear-gradient(135deg, ${color}22, ${color}0A)`,
        border: `1px solid ${color}50`,
      }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: color + '22' }}>
        <MIcon name={icon} size={18} color={color} fill={1} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Stencil color={color}>Main Insight</Stencil>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: color + '20', color }}>
            {cluster.percentage}% · {cluster.count}/{totalCount} คน
          </span>
        </div>
        <p className="text-[14px] font-semibold" style={{ color: T.fg1 }}>{cluster.themeTitle}</p>
        {cluster.representativeComments[0] && (
          <p className="text-[11px] mt-0.5 truncate" style={{ color: T.fg3 }}>
            "{cluster.representativeComments[0]}"
          </p>
        )}
      </div>
    </div>
  )
}

// ─── AnimatedCounter ─────────────────────────────────────────────
function AnimatedCounter({
  value, color = T.fg1, size = 36, suffix = '', animate = true,
}: {
  value: number | string; color?: string; size?: number; suffix?: string; animate?: boolean
}) {
  const flipKey = useAnimatedNumber(typeof value === 'number' ? value : 0)
  return (
    <span
      key={animate ? flipKey : undefined}
      className={animate ? 'anim-count-flip inline-block' : 'inline-block'}
      style={{ fontSize: size, fontWeight: 700, color, lineHeight: 1, fontFamily: 'inherit' }}
    >
      {value}{suffix}
    </span>
  )
}

// ─── TrendPanel ──────────────────────────────────────────────────
function TrendPanel({
  currentResponders, avgRatingVal, clusters,
}: {
  currentResponders: number
  avgRatingVal: number | null
  clusters: ThemeCluster[]
}) {
  // Mock previous batch baseline (would come from Firestore impactRecords in production)
  const prev = { respRate: 72, rating: 3.4, topIssues: 4 }
  const currRate = currentResponders > 0 ? Math.min(99, 60 + currentResponders) : 0
  const currIssues = clusters.filter(c => c.percentage >= 20).length

  const rows = [
    { label: 'ตอบ / Resp Rate', prev: `${prev.respRate}%`, curr: `${currRate}%`, up: currRate >= prev.respRate },
    { label: 'Rating เฉลี่ย',   prev: prev.rating.toFixed(1), curr: avgRatingVal ? avgRatingVal.toFixed(1) : '—', up: (avgRatingVal ?? 0) >= prev.rating },
    { label: 'Issues สำคัญ',   prev: String(prev.topIssues), curr: String(currIssues), up: currIssues <= prev.topIssues },
  ]

  return (
    <div className="p-3 rounded-2xl flex flex-col gap-2"
      style={{ background: T.surfaceLight, border: `1px solid ${T.border}` }}>
      <Stencil color={T.fg3} className="mb-1">Trend · vs รุ่นก่อน</Stencil>
      {rows.map(r => (
        <div key={r.label} className="flex items-center justify-between gap-2">
          <span className="text-[11px] truncate" style={{ color: T.fg3 }}>{r.label}</span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono" style={{ color: T.fg3 }}>{r.prev}</span>
            <MIcon name={r.up ? 'trending_up' : 'trending_down'} size={13} color={r.up ? T.success : T.error} />
            <span className="text-[12px] font-bold font-mono" style={{ color: r.up ? T.success : T.error }}>{r.curr}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── CommanderSummary ─────────────────────────────────────────────
function CommanderSummary({
  session, totalResponders, activeResponses, clusters, avgRating: avg, chartData,
}: {
  session: LiveSession | null
  totalResponders: number
  activeResponses: Response[]
  clusters: ThemeCluster[]
  avgRating: number | null
  chartData: { option: string; count: number; pct: number }[]
}) {
  const bullets = useMemo<string[]>(() => {
    const out: string[] = []
    const respRate = totalResponders > 0 ? Math.round((activeResponses.length / totalResponders) * 100) : 0
    out.push(`อัตราตอบรับ: ${activeResponses.length}/${totalResponders} คน (${respRate}%)`)
    if (avg !== null) out.push(`คะแนนเฉลี่ย: ${avg.toFixed(1)}/5 — ${avg >= 4 ? 'ดีมาก ✓' : avg >= 3 ? 'อยู่ในเกณฑ์' : 'ต้องปรับปรุง ⚠'}`)
    if (chartData.length) {
      const top = [...chartData].sort((a, b) => b.pct - a.pct)[0]
      out.push(`ตัวเลือกที่เลือกมากที่สุด: "${top.option}" (${top.pct}%)`)
    }
    if (clusters.length) {
      const top = clusters[0]
      out.push(`ประเด็นหลัก: ${top.themeTitle} (${top.percentage}% · ${top.count} คน)`)
      const p1 = clusters.filter(c => c.percentage >= 30)
      if (p1.length) out.push(`ประเด็น P1 ที่ต้องดำเนินการด่วน: ${p1.length} รายการ`)
    }
    if (!session?.closedAt && session?.status === 'active') out.push('สถานะ: Session กำลังดำเนินการอยู่')
    return out
  }, [totalResponders, activeResponses, clusters, avg, chartData, session])

  if (!bullets.length) return null

  return (
    <div className="relative overflow-hidden rounded-2xl p-4 flex flex-col gap-2 hud-scan anim-summary"
      style={{ background: T.primary + '0D', border: `1px solid ${T.primary}30` }}>
      <div className="flex items-center gap-2 mb-1">
        <MIcon name="summarize" size={16} color={T.primary} fill={1} />
        <Stencil color={T.primary}>Commander Summary</Stencil>
      </div>
      <div className="flex flex-col gap-1.5">
        {bullets.map((b, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="font-mono text-[10px] mt-0.5 shrink-0" style={{ color: T.primary }}>▸</span>
            <p className="text-[12px]" style={{ color: T.fg1 }}>{b}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── ClusterDetail (with smart suggestion) ───────────────────────
function ClusterDetail({
  cluster, onCreateIssue, onClose, issuedIds,
}: {
  cluster: ThemeCluster
  onCreateIssue: (cl: ThemeCluster, actions: string[]) => Promise<void>
  onClose: () => void
  issuedIds: Set<string>
}) {
  const [busy, setBusy] = useState(false)
  const color   = CAT_COLOR[cluster.category] ?? T.accentPurple
  const issued  = issuedIds.has(cluster.clusterId)
  const auto    = SUGGESTED_ACTIONS[cluster.category] ?? SUGGESTED_ACTIONS.other
  const autoSev = cluster.percentage >= 30 ? 'P1' : cluster.percentage >= 20 ? 'P2' : 'P3'
  const sevColor = autoSev === 'P1' ? T.error : autoSev === 'P2' ? T.warning : T.info

  async function handle() {
    setBusy(true)
    await onCreateIssue(cluster, auto)
    setBusy(false)
  }

  return (
    <div className="p-4 rounded-2xl flex flex-col gap-3"
      style={{ background: color + '10', border: `1px solid ${color}40` }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Stencil color={color}>{cluster.category}</Stencil>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: sevColor + '22', color: sevColor }}>
              {autoSev} — {cluster.percentage}%
            </span>
          </div>
          <p className="mt-1 font-bold text-[15px]" style={{ color: T.fg1 }}>{cluster.themeTitle}</p>
          <p className="text-[11px]" style={{ color: T.fg3 }}>{cluster.count} คน</p>
        </div>
        <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 shrink-0">
          <MIcon name="close" size={16} color={T.fg3} />
        </button>
      </div>

      {/* Quotes */}
      <div className="flex flex-col gap-1.5">
        {cluster.representativeComments.slice(0, 3).map((c, i) => (
          <p key={i} className="text-[11px] py-2 px-3 rounded-xl"
            style={{ color: T.fg1, background: T.card, borderLeft: `3px solid ${color}` }}>
            "{c}"
          </p>
        ))}
      </div>

      {/* Keywords */}
      {cluster.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {cluster.keywords.slice(0, 6).map(kw => (
            <span key={kw} className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: color + '22', color }}>{kw}</span>
          ))}
        </div>
      )}

      {/* Smart suggestions */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <MIcon name="auto_fix_high" size={13} color={T.accentHud} />
          <Stencil color={T.accentHud}>มาตรการที่แนะนำ</Stencil>
        </div>
        <div className="flex flex-col gap-1">
          {auto.map((a, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px]" style={{ color: T.fg2 }}>
              <span className="font-mono text-[10px] mt-0.5 shrink-0" style={{ color: T.accentHud }}>
                {i + 1}.
              </span>
              {a}
            </div>
          ))}
        </div>
      </div>

      {/* Create issue */}
      {issued ? (
        <div className="flex items-center gap-2 text-[12px]" style={{ color: T.success }}>
          <MIcon name="check_circle" size={15} color={T.success} fill={1} />
          สร้าง Issue พร้อมมาตรการแนะนำแล้ว
        </div>
      ) : (
        <button type="button" disabled={busy} onClick={handle}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold hover:opacity-80 disabled:opacity-40 transition-all"
          style={{ background: T.error + '22', color: T.error, border: `1px solid ${T.error}50` }}>
          <MIcon name="add_circle" size={16} color={T.error} fill={1} />
          {busy ? 'กำลังสร้าง Issue...' : `สร้าง Issue (${autoSev}) พร้อมมาตรการ`}
        </button>
      )}
    </div>
  )
}

// ─── RatingDisplay ───────────────────────────────────────────────
function RatingDisplay({ avg, count, large = false }: { avg: number; count: number; large?: boolean }) {
  const filled = Math.round(avg)
  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <AnimatedCounter value={+avg.toFixed(1)} color={T.primary} size={large ? 96 : 64} />
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(n => (
          <span key={n} style={{
            fontSize: large ? 40 : 28, color: n <= filled ? T.primary : T.surfaceLight,
            transition: 'color 0.3s', filter: n <= filled ? `drop-shadow(0 0 6px ${T.primary}80)` : 'none',
          }}>★</span>
        ))}
      </div>
      <p style={{ fontSize: large ? 18 : 13, color: T.fg2 }}>คะแนนเฉลี่ย · {count} คนตอบ</p>
    </div>
  )
}

// ─── LiveFeed ────────────────────────────────────────────────────
function LiveFeed({ responses }: { responses: Response[] }) {
  const prevIds = useRef<Set<string>>(new Set())
  const [newIds, setNewIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fresh = responses.filter(r => !prevIds.current.has(r.responseId)).map(r => r.responseId)
    responses.forEach(r => prevIds.current.add(r.responseId))
    if (fresh.length) {
      setNewIds(new Set(fresh))
      const t = setTimeout(() => setNewIds(new Set()), 2000)
      return () => clearTimeout(t)
    }
  }, [responses])

  return (
    <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
      {[...responses].reverse().slice(0, 8).map(r => (
        <div key={r.responseId}
          className={`px-3 py-2 rounded-lg text-[12px] border border-transparent transition-all ${newIds.has(r.responseId) ? 'anim-new-response' : ''}`}
          style={{ background: T.surfaceLight, color: T.fg1 }}>
          {newIds.has(r.responseId) && (
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle"
              style={{ background: T.success, boxShadow: `0 0 6px ${T.success}` }} />
          )}
          <span className="font-mono text-[10px] mr-2" style={{ color: T.fg3 }}>{r.studentAlias}</span>
          {r.answerText}
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────
export default function LiveDashboardPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const nav = useNavigate()

  const [session,          setSession]          = useState<LiveSession | null>(null)
  const [questions,        setQuestions]        = useState<Question[]>([])
  const [allResponsesRaw,  setAllResponsesRaw]  = useState<Response[]>([])
  const [activeRespRaw,    setActiveRespRaw]    = useState<Response[]>([])
  const [clusters,         setClusters]         = useState<ThemeCluster[]>([])
  const [selectedCluster,  setSelectedCluster]  = useState<ThemeCluster | null>(null)
  const [issuedIds,        setIssuedIds]        = useState<Set<string>>(new Set())
  const [showQR,           setShowQR]           = useState(false)
  const [presMode,         setPresMode]         = useState(false)
  const [seedBusy,         setSeedBusy]         = useState(false)
  const [seedMsg,          setSeedMsg]          = useState('')
  const [showSummary,      setShowSummary]      = useState(false)
  const [listenerError,    setListenerError]    = useState<string | null>(null)
  const [autoRotateEnabled, setAutoRotateEnabled] = useLocalStorage<boolean>('aar:pres:auto-rotate', true)
  const [decisionTimerEnabled, setDecisionTimerEnabled] = useLocalStorage<boolean>('aar:pres:decision-timer', true)
  const [autoRotatePausedUntil, setAutoRotatePausedUntil] = useState(0)
  const [decisionDeadline, setDecisionDeadline] = useState<number | null>(null)
  const [decisionFrozenQuestionId, setDecisionFrozenQuestionId] = useState<string | null>(null)
  const [frozenActiveResponses, setFrozenActiveResponses] = useState<Response[]>([])
  const [frozenClusters, setFrozenClusters] = useState<ThemeCluster[]>([])
  const [frozenChartData, setFrozenChartData] = useState<ChoiceDatum[]>([])
  const [frozenAvgRating, setFrozenAvgRating] = useState<number | null>(null)
  const [snapshotBusy, setSnapshotBusy] = useState(false)
  const [snapshotError, setSnapshotError] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const presRef = useRef<HTMLDivElement>(null)
  const dashboardRef = useRef<HTMLDivElement>(null)
  const activeResponsesRef = useRef<Response[]>([])
  const clustersRef = useRef<ThemeCluster[]>([])
  const chartDataRef = useRef<ChoiceDatum[]>([])
  const avgRatingRef = useRef<number | null>(null)

  // ── Debounce response arrays (150 ms) to batch rapid Firestore writes ──
  const allResponses    = useDebounce(allResponsesRaw,  150)
  const activeResponses = useDebounce(activeRespRaw,    150)

  // ── localStorage: remember last session for quick recovery ────────
  const [, setLastSession] = useLocalStorage<string>('aar:lastSession', '')

  // ── subscriptions ───────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return
    setListenerError(null)
    const onErr = (err: { message: string }) =>
      setListenerError(`การเชื่อมต่อ Firestore ขัดข้อง: ${err.message}`)

    const u1 = subscribeToSession(sessionId, s => {
      setSession(s)
      if (s) setLastSession(s.sessionId)
    }, { onError: onErr })
    const u2 = subscribeToQuestions(sessionId, setQuestions, { onError: onErr })
    const u3 = subscribeToAllSessionResponses(sessionId, setAllResponsesRaw, { onError: onErr })
    return () => { u1(); u2(); u3() }
  }, [sessionId])

  const activeQ = questions.find(q => q.questionId === session?.currentQuestionId) ?? questions[0]

  useEffect(() => {
    if (!sessionId || !activeQ) return
    setSelectedCluster(null)
    let disposed = false
    let aiRun = 0
    const onErr = (err: { message: string }) =>
      setListenerError(`ไม่สามารถรับคำตอบ: ${err.message}`)

    const u = subscribeToResponses(sessionId, activeQ.questionId, rs => {
      setActiveRespRaw(rs)
      if (activeQ.type !== 'openText') {
        setClusters([])
        return
      }

      const fallbackClusters = clusterResponses(rs, sessionId, activeQ.questionId)
      const runId = ++aiRun
      setClusters(fallbackClusters)
      void clusterOpenTextResponses(rs, sessionId, activeQ.questionId, activeQ.type).then(nextClusters => {
        if (!disposed && runId === aiRun) setClusters(nextClusters)
      })
    }, { onError: onErr })
    return () => {
      disposed = true
      u()
    }
  }, [sessionId, activeQ?.questionId])

  useEffect(() => {
    activeResponsesRef.current = activeResponses
    clustersRef.current = clusters
  }, [activeResponses, clusters])

  const registerPresentationInteraction = useCallback(() => {
    if (!presMode) return
    setAutoRotatePausedUntil(Date.now() + INTERACTION_PAUSE_MS)
  }, [presMode])

  // ── keyboard shortcuts ──────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Escape')  { setShowQR(false); setPresMode(false) }
      if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.metaKey) setPresMode(v => !v)
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey) toggleFullscreen()
      if ((e.key === 'q' || e.key === 'Q') && !e.ctrlKey && !e.metaKey) { registerPresentationInteraction(); setShowQR(v => !v) }
      if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey) { registerPresentationInteraction(); setShowSummary(v => !v) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [registerPresentationInteraction, toggleFullscreen])

  // ── actions ─────────────────────────────────────────────────
  async function activateQuestion(qId: string, options?: { causedByInteraction?: boolean }) {
    if (!sessionId) return
    if (options?.causedByInteraction) registerPresentationInteraction()
    if (activeQ) await setActiveQuestion(activeQ.questionId, false)
    await setActiveQuestion(qId, true)
    await updateSessionStatus(sessionId, 'active', qId)
  }

  async function closeSession() {
    if (!sessionId) return
    await updateSessionStatus(sessionId, 'closed')
    nav('/sessions')
  }

  async function handleCreateIssue(cluster: ThemeCluster, actions: string[] = []) {
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
    // In production: also write actions[] to Firestore actions collection
    console.info('[Issue] Created with suggested actions:', actions)
    setIssuedIds(s => new Set([...s, cluster.clusterId]))
  }

  async function handleSeed() {
    setSeedBusy(true); setSeedMsg('')
    const { created, skipped } = await seedDemoData()
    setSeedMsg(`✅ ${created.join(', ')}${skipped.length ? ` · ⏭ ${skipped.join(', ')}` : ''}`)
    setSeedBusy(false)
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) presRef.current?.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  // ── derived ─────────────────────────────────────────────────
  const totalResponders = new Set(allResponses.map(r => r.studentAlias)).size
  const joinUrl   = `${window.location.origin}/join/${session?.joinCode ?? ''}`
  const chartData = activeQ && (activeQ.type === 'multipleChoice' || activeQ.type === 'yesNo')
    ? countOptionResponses(activeResponses, activeQ.options) : []
  const avgRating = activeQ?.type === 'rating' ? averageRating(activeResponses) : null
  const qIdx      = questions.findIndex(q => q.questionId === activeQ?.questionId)
  const qNumber   = qIdx >= 0 ? qIdx + 1 : 0

  const goToNextQuestion = useCallback(async () => {
    if (!activeQ || questions.length < 2) return
    const nextQuestion = questions[(qIdx + 1) % questions.length]
    if (!nextQuestion || nextQuestion.questionId === activeQ.questionId) return
    await activateQuestion(nextQuestion.questionId)
  }, [activeQ, qIdx, questions])

  useEffect(() => {
    chartDataRef.current = chartData
    avgRatingRef.current = avgRating
  }, [chartData, avgRating])

  const decisionFrozen = presMode && !!activeQ && decisionFrozenQuestionId === activeQ.questionId
  const displayActiveResponses = decisionFrozen ? frozenActiveResponses : activeResponses
  const displayClusters = decisionFrozen ? frozenClusters : clusters
  const displayChartData = decisionFrozen ? frozenChartData : chartData
  const displayAvgRating = decisionFrozen ? frozenAvgRating : avgRating
  const displayRespPct = totalResponders > 0 ? Math.round((displayActiveResponses.length / totalResponders) * 100) : 0
  const focusCluster = displayClusters.length ? displayClusters[0] : null
  const decisionCountdownMs = decisionTimerEnabled && decisionDeadline
    ? Math.max(0, decisionDeadline - nowMs)
    : 0
  const decisionCountdownSeconds = Math.ceil(decisionCountdownMs / 1000)
  const rotatePaused = autoRotatePausedUntil > nowMs
  const rotateResumeSeconds = Math.ceil(Math.max(0, autoRotatePausedUntil - nowMs) / 1000)
  const hasActiveQuestion = !!activeQ && qIdx >= 0

  // Disable heavy animations when crowd is large (prevents layout thrash)
  const animEnabled = totalResponders <= 50

  useEffect(() => {
    if (!presMode || (!autoRotateEnabled && !decisionTimerEnabled)) return
    const ticker = window.setInterval(() => setNowMs(Date.now()), 250)
    return () => window.clearInterval(ticker)
  }, [autoRotateEnabled, decisionTimerEnabled, presMode])

  useEffect(() => {
    if (!presMode || !activeQ || session?.status !== 'active') {
      setDecisionDeadline(null)
      setDecisionFrozenQuestionId(null)
      setFrozenActiveResponses([])
      setFrozenClusters([])
      setFrozenChartData([])
      setFrozenAvgRating(null)
      return
    }

    setDecisionFrozenQuestionId(null)
    setFrozenActiveResponses([])
    setFrozenClusters([])
    setFrozenChartData([])
    setFrozenAvgRating(null)
    setDecisionDeadline(decisionTimerEnabled ? Date.now() + DECISION_TIMER_MS : null)
  }, [activeQ?.questionId, decisionTimerEnabled, presMode, session?.status])

  useEffect(() => {
    if (!presMode || !decisionTimerEnabled || !activeQ || !decisionDeadline || decisionFrozen) return
    if (nowMs < decisionDeadline) return

    setDecisionFrozenQuestionId(activeQ.questionId)
    setFrozenActiveResponses(activeResponsesRef.current)
    setFrozenClusters(clustersRef.current)
    setFrozenChartData(chartDataRef.current)
    setFrozenAvgRating(avgRatingRef.current)
  }, [activeQ, decisionDeadline, decisionFrozen, decisionTimerEnabled, nowMs, presMode])

  useEffect(() => {
    if (!presMode || !autoRotateEnabled || !hasActiveQuestion || rotatePaused || questions.length < 2 || session?.status !== 'active') return
    const timer = window.setTimeout(() => {
      void goToNextQuestion()
    }, AUTO_ROTATE_MS)
    return () => window.clearTimeout(timer)
  }, [autoRotateEnabled, goToNextQuestion, hasActiveQuestion, presMode, questions.length, rotatePaused, session?.status, activeQ?.questionId])

  async function handleSnapshot() {
    const target = presMode ? presRef.current : dashboardRef.current
    if (snapshotBusy) return
    if (!target) {
      setSnapshotError('Snapshot target is not ready yet')
      return
    }
    registerPresentationInteraction()
    setSnapshotBusy(true)
    setSnapshotError(null)
    const restoreSummary = showSummary

    try {
      if (!showSummary) {
        setShowSummary(true)
        await new Promise(resolve => window.setTimeout(resolve, 120))
      }

      const canvas = await html2canvas(target, {
        backgroundColor: T.bg,
        scale: Math.min(window.devicePixelRatio || 1, 2),
        useCORS: true,
        logging: false,
      })

      const link = document.createElement('a')
      const questionLabel = activeQ && qNumber > 0 ? `q${qNumber}` : 'overview'
      link.download = `signal-aar-${session?.joinCode ?? 'session'}-${questionLabel}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('[snapshot]', err)
      setSnapshotError(err instanceof Error ? err.message : 'Snapshot capture failed')
    } finally {
      if (!restoreSummary) setShowSummary(false)
      setSnapshotBusy(false)
    }
  }

  // ── Shared QR overlay ───────────────────────────────────────
  const QROverlay = showQR ? (
    <div className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(5,6,8,0.92)' }}
      onClick={() => setShowQR(false)}>
      <div className="relative flex flex-col items-center gap-5 p-10 rounded-3xl"
        style={{ background: T.surface, border: `1px solid ${T.border}` }}
        onClick={e => e.stopPropagation()}>
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

  // ────────────────────────────────────────────────────────────
  // PRESENTATION MODE
  // ────────────────────────────────────────────────────────────
  if (presMode) {
    return (
      <>
        {QROverlay}
        <div ref={presRef} className="fixed inset-0 z-[100] flex flex-col overflow-auto"
          style={{ background: T.bg, fontFamily: 'Sarabun, system-ui, sans-serif' }}>
          <HUDGrid opacity={0.04} />

          {/* Pres top bar */}
          <header className="relative z-10 flex items-center justify-between px-8 py-3 shrink-0"
            style={{ background: T.surface + 'E0', borderBottom: `1px solid ${T.primary}30` }}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{ background: T.error + '18', border: `1px solid ${T.error}40` }}>
                <span className="w-2 h-2 rounded-full animate-live-pulse"
                  style={{ background: T.error, boxShadow: `0 0 8px ${T.error}` }} />
                <span className="font-mono text-[11px] font-bold tracking-[3px]" style={{ color: T.error }}>LIVE AAR</span>
              </div>
              <div className="hidden md:block">
                <p className="text-[13px] font-bold" style={{ color: T.fg1 }}>{session?.title}</p>
                <p className="text-[10px] font-mono" style={{ color: T.fg3 }}>{session?.joinCode} · RADIO & EW DEPT.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{ background: T.primary + '12', border: `1px solid ${T.primary}30` }}>
                <MIcon name={autoRotateEnabled ? 'autoplay' : 'pause_circle'} size={14} color={T.primary} fill={1} />
                <span className="text-[10px] font-semibold" style={{ color: T.fg2 }}>
                  {autoRotateEnabled ? (rotatePaused ? `Auto pause ${rotateResumeSeconds}s` : 'Auto rotate 15s') : 'Auto rotate off'}
                </span>
              </div>
              <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{ background: T.warning + '12', border: `1px solid ${T.warning}30` }}>
                <MIcon name={decisionFrozen ? 'timer_off' : 'timer'} size={14} color={T.warning} fill={1} />
                <span className="text-[10px] font-semibold" style={{ color: T.fg2 }}>
                  {decisionTimerEnabled ? (decisionFrozen ? 'Results frozen' : `${decisionCountdownSeconds}s left`) : 'Timer off'}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{ background: T.accentBlue + '15', border: `1px solid ${T.accentBlue}30` }}>
                <MIcon name="group" size={14} color={T.accentBlue} fill={1} />
                <AnimatedCounter value={totalResponders} color={T.accentBlue} size={15} />
                <span className="text-[10px]" style={{ color: T.fg3 }}>คน</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{ background: T.success + '15', border: `1px solid ${T.success}30` }}>
                <MIcon name="done" size={14} color={T.success} fill={1} />
                <AnimatedCounter value={displayActiveResponses.length} color={T.success} size={15} />
                <span className="text-[10px]" style={{ color: T.fg3 }}>ตอบ</span>
              </div>
              <span className="hidden lg:block text-[10px]" style={{ color: T.fg3 }}>P·F·Q·S·Esc</span>
              <GhostBtn onClick={() => { registerPresentationInteraction(); setAutoRotateEnabled(!autoRotateEnabled) }} icon={autoRotateEnabled ? 'pause_circle' : 'autoplay'} size="sm">Auto</GhostBtn>
              <GhostBtn onClick={() => { registerPresentationInteraction(); setDecisionTimerEnabled(!decisionTimerEnabled) }} icon={decisionTimerEnabled ? 'timer' : 'timer_off'} size="sm">Timer</GhostBtn>
              <GhostBtn onClick={() => { registerPresentationInteraction(); setShowSummary(v => !v) }} icon="summarize" size="sm">Summary</GhostBtn>
              <GhostBtn onClick={() => { registerPresentationInteraction(); void handleSnapshot() }} icon="photo_camera" size="sm">{snapshotBusy ? 'Saving...' : 'Snapshot'}</GhostBtn>
              <GhostBtn onClick={() => { registerPresentationInteraction(); setShowQR(true) }} icon="qr_code" size="sm">QR</GhostBtn>
              <GhostBtn onClick={() => { registerPresentationInteraction(); toggleFullscreen() }} icon="fullscreen" size="sm">Full</GhostBtn>
              <button type="button" onClick={() => setPresMode(false)}
                className="px-3 py-1.5 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 hover:opacity-80"
                style={{ background: T.error + '18', color: T.error, border: `1px solid ${T.error}40` }}>
                <MIcon name="close" size={14} color={T.error} />ออก
              </button>
            </div>
          </header>

          {(listenerError || snapshotError) && (
            <div className="relative z-10 flex items-center gap-3 px-8 py-2"
              style={{ background: T.error + '14', borderBottom: `1px solid ${T.error}35` }}>
              <MIcon name={listenerError ? 'wifi_off' : 'photo_camera'} size={15} color={T.error} />
              <p className="text-[12px] font-semibold flex-1" style={{ color: T.error }}>
                {listenerError ?? `Snapshot failed: ${snapshotError}`}
              </p>
              <button type="button" onClick={() => { setListenerError(null); setSnapshotError(null) }}
                className="p-1 rounded hover:opacity-70">
                <MIcon name="close" size={14} color={T.error} />
              </button>
            </div>
          )}

          {/* Pres 3-column */}
          <div className="relative flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] overflow-hidden">

            {/* Left: question nav + QR */}
            <div className="flex flex-col gap-4 p-5 border-r overflow-y-auto"
              style={{ borderColor: T.border + '60' }}>
              <div>
                <Stencil color={T.fg3} className="mb-3">Q {qNumber || '-'} / {questions.length}</Stencil>
                <div className="flex flex-col gap-2">
                  {questions.map((q, i) => {
                    const isCurr = q.questionId === activeQ?.questionId
                    const cnt = allResponses.filter(r => r.questionId === q.questionId).length
                    return (
                      <div key={q.questionId}
                        onClick={() => session?.status === 'active' && activateQuestion(q.questionId, { causedByInteraction: true })}
                        className="p-2.5 rounded-xl cursor-pointer transition-all"
                        style={{ background: isCurr ? T.primary + '18' : T.surfaceLight, border: `1px solid ${isCurr ? T.primary + '60' : T.border}`, opacity: isCurr ? 1 : 0.65 }}>
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

              {/* Trend mini */}
              <TrendPanel currentResponders={totalResponders} avgRatingVal={displayAvgRating} clusters={displayClusters} />

              {/* QR */}
              <div className="relative flex flex-col items-center gap-3 p-4 rounded-2xl mt-auto"
                style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <CornerBrackets color={T.primary} size={12} />
                <Stencil color={T.fg3}>Student Join</Stencil>
                <QRCodeSVG value={joinUrl} size={130} bgColor={T.surface} fgColor={T.fg1} level="H" />
                <span className="font-mono font-bold tracking-[6px]"
                  style={{ fontSize: 20, color: T.primary, textShadow: `0 0 16px ${T.primary}80` }}>
                  {session?.joinCode}
                </span>
              </div>
            </div>

            {/* Center: result */}
            <div className="flex flex-col items-center justify-start p-8 gap-5 overflow-y-auto">
              {/* Insight banner (auto focus) */}
              {focusCluster && activeQ?.type === 'openText' && (
                <div className="w-full max-w-2xl">
                  <InsightBanner cluster={focusCluster} totalCount={displayActiveResponses.length} />
                </div>
              )}

              {/* Commander summary overlay */}
              {showSummary && (
                <div className="w-full max-w-2xl">
                  <CommanderSummary session={session} totalResponders={totalResponders}
                    activeResponses={displayActiveResponses} clusters={displayClusters}
                    avgRating={displayAvgRating} chartData={displayChartData} />
                </div>
              )}

              {!activeQ && (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                  <MIcon name="hourglass_empty" size={54} color={T.fg3} />
                  <p className="text-[18px] font-semibold" style={{ color: T.fg2 }}>No active question</p>
                  <p className="text-[12px]" style={{ color: T.fg3 }}>Start a session or select a question to show live results.</p>
                </div>
              )}

              {activeQ && (
                <>
                  <div className="w-full max-w-2xl">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <Stencil color={decisionFrozen ? T.warning : T.primary}>
                        {decisionFrozen ? 'Decision Locked' : 'Decision Window'}
                      </Stencil>
                      <div className="flex items-center gap-2">
                        {rotatePaused && autoRotateEnabled && (
                          <Chip color={T.warning} icon="pause">{rotateResumeSeconds}s</Chip>
                        )}
                        {decisionTimerEnabled && (
                          <Chip color={decisionFrozen ? T.warning : T.primary} icon={decisionFrozen ? 'timer_off' : 'timer'}>
                            {decisionFrozen ? 'Frozen' : `${decisionCountdownSeconds}s`}
                          </Chip>
                        )}
                      </div>
                    </div>
                    <div className="w-full overflow-hidden rounded-full" style={{ height: 8, background: T.surfaceLight }}>
                      <div
                        style={{
                          width: `${decisionTimerEnabled ? (decisionFrozen ? 100 : Math.max(0, Math.min(100, ((DECISION_TIMER_MS - decisionCountdownMs) / DECISION_TIMER_MS) * 100))) : 0}%`,
                          height: '100%',
                          background: decisionFrozen
                            ? `linear-gradient(90deg, ${T.warning}, ${T.warning}CC)`
                            : `linear-gradient(90deg, ${T.primary}, ${T.accentBlue})`,
                          transition: 'width 0.2s linear',
                        }}
                      />
                    </div>
                  </div>

                  <div className="text-center w-full max-w-2xl">
                    <p className="text-[13px] font-mono mb-3" style={{ color: T.primary }}>
                      คำถามที่ {qNumber || '-'} / {questions.length}
                    </p>
                    <p className="font-bold leading-snug" style={{ fontSize: 'clamp(22px,3vw,36px)', color: T.fg1 }}>
                      {activeQ.text}
                    </p>
                  </div>

                  {displayChartData.length > 0 && (
                    <div className="w-full max-w-2xl">
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={displayChartData} layout="vertical" margin={{ left: 16, right: 90, top: 4, bottom: 4 }}>
                          <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: T.fg3, fontSize: 13 }} />
                          <YAxis type="category" dataKey="option" tick={{ fill: T.fg1, fontSize: 15 }} width={200} />
                          <Bar dataKey="pct" radius={[0, 6, 6, 0]}
                            label={{ position: 'right', formatter: (v: unknown) => `${typeof v === 'number' ? v : 0}%`, fill: T.fg1, fontSize: 15, fontWeight: 700 }}>
                            {displayChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {displayAvgRating !== null && <RatingDisplay avg={displayAvgRating} count={displayActiveResponses.length} large />}

                  {activeQ.type === 'openText' && displayClusters.length > 0 && (
                    <div className="w-full max-w-2xl">
                      <Stencil color={T.accentPurple} className="mb-6 text-center block">AI Theme Clusters</Stencil>
                      <BubbleCloud clusters={displayClusters} selected={selectedCluster} onSelect={(cluster) => { registerPresentationInteraction(); setSelectedCluster(cluster) }}
                        focusId={focusCluster?.clusterId} large />
                      {selectedCluster && (
                        <div className="mt-8">
                          <ClusterDetail cluster={selectedCluster} onCreateIssue={async (cluster, actions) => {
                            registerPresentationInteraction()
                            await handleCreateIssue(cluster, actions)
                          }}
                            onClose={() => setSelectedCluster(null)} issuedIds={issuedIds} />
                        </div>
                      )}
                    </div>
                  )}

                  {activeQ.type === 'openText' && displayActiveResponses.length > 0 && !displayClusters.length && (
                    <div className="w-full max-w-2xl">
                      <LiveFeed responses={displayActiveResponses} />
                    </div>
                  )}

                  {displayActiveResponses.length === 0 && (
                    <div className="w-full max-w-2xl rounded-2xl px-5 py-8 text-center"
                      style={{ background: T.surfaceLight, border: `1px solid ${T.border}` }}>
                      <MIcon name="inbox" size={34} color={T.fg3} />
                      <p className="mt-2 text-[14px] font-semibold" style={{ color: T.fg2 }}>Waiting for responses</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right: counters + controls */}
            <div className="flex flex-col gap-4 p-5 border-l overflow-y-auto"
              style={{ borderColor: T.border + '60' }}>
              {[
                { label: 'ตอบแล้ว',   value: displayActiveResponses.length, color: T.success,    icon: 'done_all' },
                { label: 'คนทั้งหมด', value: totalResponders,         color: T.accentBlue, icon: 'group' },
                { label: '% ตอบ',     value: displayRespPct,          color: T.primary,    icon: 'percent', suffix: '%' },
              ].map(s => (
                <div key={s.label} className="relative p-4 rounded-2xl flex flex-col items-center"
                  style={{ background: s.color + '12', border: `1px solid ${s.color}30` }}>
                  <MIcon name={s.icon} size={20} color={s.color} fill={1} />
                  <AnimatedCounter value={s.value} color={s.color} size={48} suffix={s.suffix} animate={animEnabled} />
                  <Stencil color={s.color + 'AA'} className="mt-1">{s.label}</Stencil>
                </div>
              ))}

              <Card padding={14} style={{ background: T.surfaceLight, border: `1px solid ${T.border}` }}>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <Stencil color={T.fg3}>Presentation Controls</Stencil>
                  <span className="text-[10px]" style={{ color: T.fg3 }}>Interaction pauses auto rotate</span>
                </div>
                <div className="flex flex-col gap-2">
                  <GhostBtn onClick={() => { registerPresentationInteraction(); setAutoRotateEnabled(!autoRotateEnabled) }} icon={autoRotateEnabled ? 'pause_circle' : 'autoplay'}>
                    {autoRotateEnabled ? 'Pause Auto Rotate' : 'Resume Auto Rotate'}
                  </GhostBtn>
                  <GhostBtn onClick={() => { registerPresentationInteraction(); setDecisionTimerEnabled(!decisionTimerEnabled) }} icon={decisionTimerEnabled ? 'timer' : 'timer_off'}>
                    {decisionTimerEnabled ? 'Disable Timer' : 'Enable Timer'}
                  </GhostBtn>
                  <GhostBtn onClick={() => { registerPresentationInteraction(); void handleSnapshot() }} icon="photo_camera">
                    {snapshotBusy ? 'Capturing Snapshot...' : 'Capture PNG Snapshot'}
                  </GhostBtn>
                </div>
              </Card>

              <div className="flex flex-col gap-2 mt-auto pt-4 border-t" style={{ borderColor: T.border }}>
                {session?.status === 'active' && (
                  <button type="button" onClick={closeSession}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold hover:opacity-80"
                    style={{ background: T.error + '18', color: T.error, border: `1px solid ${T.error}40` }}>
                    <MIcon name="stop_circle" size={16} color={T.error} />ปิด Session
                  </button>
                )}
                {session?.status === 'draft' && (
                  <PrimaryBtn onClick={() => sessionId && updateSessionStatus(sessionId, 'active', activeQ?.questionId ?? null)} icon="play_arrow">
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

  // ────────────────────────────────────────────────────────────
  // NORMAL DASHBOARD LAYOUT
  // ────────────────────────────────────────────────────────────
  return (
    <>
      {QROverlay}
      <div ref={dashboardRef} className="relative min-h-screen" style={{ background: T.bg }}>
        <HUDGrid opacity={0.03} />

        {/* ── Reconnect error banner ─────────────────────────── */}
        {listenerError && (
          <div
            className="relative z-20 flex items-center gap-3 px-6 py-2.5"
            style={{ background: T.error + '18', borderBottom: `1px solid ${T.error}50` }}
          >
            <span className="w-2 h-2 rounded-full animate-live-pulse shrink-0"
              style={{ background: T.error }} />
            <p className="text-[12px] font-semibold flex-1" style={{ color: T.error }}>
              ⚠ {listenerError}
            </p>
            <button
              type="button"
              onClick={() => { setListenerError(null); window.location.reload() }}
              className="text-[11px] px-3 py-1 rounded-lg font-semibold hover:opacity-80"
              style={{ background: T.error + '30', color: T.error }}
            >
              เชื่อมต่อใหม่
            </button>
            <button type="button" onClick={() => setListenerError(null)}
              title="ปิด" aria-label="ปิดแจ้งเตือน"
              className="p-1 rounded hover:opacity-70">
              <MIcon name="close" size={14} color={T.error} />
            </button>
          </div>
        )}

        {/* ── Animation throttle notice (> 50 responders) ──── */}
        {!animEnabled && (
          <div className="relative z-10 flex items-center gap-2 px-6 py-1.5"
            style={{ background: T.warning + '12', borderBottom: `1px solid ${T.warning}30` }}>
            <MIcon name="speed" size={13} color={T.warning} />
            <p className="text-[11px]" style={{ color: T.warning }}>
              Performance mode — animations paused ({totalResponders} responders)
            </p>
          </div>
        )}

        {snapshotError && (
          <div className="relative z-10 flex items-center gap-2 px-6 py-1.5"
            style={{ background: T.error + '12', borderBottom: `1px solid ${T.error}30` }}>
            <MIcon name="photo_camera" size={13} color={T.error} />
            <p className="text-[11px] flex-1" style={{ color: T.error }}>
              Snapshot failed: {snapshotError}
            </p>
            <button type="button" onClick={() => setSnapshotError(null)}
              className="p-1 rounded hover:opacity-70">
              <MIcon name="close" size={13} color={T.error} />
            </button>
          </div>
        )}

        {/* Top bar */}
        <header className="relative flex items-center gap-3 px-6 py-3 border-b"
          style={{ borderColor: T.border, background: T.surface }}>
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
            <Chip color={T.accentBlue} icon="group">
              <AnimatedCounter value={totalResponders} color={T.accentBlue} size={13} />
              <span className="ml-1">คน</span>
            </Chip>

            {USE_MOCK && (
              <button type="button" onClick={handleSeed} disabled={seedBusy}
                className="px-2 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1 hover:opacity-80 disabled:opacity-40"
                style={{ background: T.accentBlue + '20', color: T.accentBlue, border: `1px solid ${T.accentBlue}40` }}>
                <MIcon name="science" size={13} color={T.accentBlue} />
                {seedBusy ? 'Seeding...' : 'Seed Demo'}
              </button>
            )}
            {seedMsg && <span className="text-[10px] max-w-[180px] truncate" style={{ color: T.success }}>{seedMsg}</span>}

            <GhostBtn onClick={() => setShowSummary(v => !v)} icon="summarize" size="sm">Summary (S)</GhostBtn>
            <GhostBtn onClick={() => setShowQR(true)} icon="qr_code" size="sm">QR (Q)</GhostBtn>
            <GhostBtn onClick={() => { void handleSnapshot() }} icon="photo_camera" size="sm">
              {snapshotBusy ? 'Saving...' : 'Snapshot'}
            </GhostBtn>
            <PrimaryBtn onClick={() => setPresMode(true)} icon="present_to_all" size="sm">Pres (P)</PrimaryBtn>
            <GhostBtn onClick={toggleFullscreen} icon="fullscreen" size="sm">Full (F)</GhostBtn>

            {session?.status === 'active' && (
              <button type="button" onClick={closeSession}
                className="px-3 py-1.5 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 hover:opacity-80"
                style={{ background: T.error + '20', color: T.error, border: `1px solid ${T.error}40` }}>
                <MIcon name="stop_circle" size={14} color={T.error} />ปิด Session
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
          <div className="xl:col-span-1 flex flex-col gap-4">
            <Card padding={14}>
              <Stencil color={T.primary} className="mb-3">คำถาม ({questions.length})</Stencil>
              <div className="flex flex-col gap-2">
                {questions.map((q, i) => {
                  const isCurr = q.questionId === (session?.currentQuestionId ?? questions[0]?.questionId)
                  const cnt = allResponses.filter(r => r.questionId === q.questionId).length
                  return (
                    <div key={q.questionId}
                      onClick={() => session?.status === 'active' && activateQuestion(q.questionId, { causedByInteraction: true })}
                      className="p-3 rounded-xl cursor-pointer transition-all hover:bg-white/5"
                      style={{ background: isCurr ? T.primary + '18' : T.surfaceLight, border: `1px solid ${isCurr ? T.primary + '60' : T.border}` }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px]" style={{ color: isCurr ? T.primary : T.fg3 }}>Q{i + 1}</span>
                        <AnimatedCounter value={cnt} color={T.fg3} size={10} />
                      </div>
                      <p className="text-[12px] line-clamp-2" style={{ color: isCurr ? T.fg1 : T.fg2 }}>
                        {q.text || '(ยังไม่ระบุ)'}
                      </p>
                      <p className="text-[10px] mt-0.5 capitalize" style={{ color: isCurr ? T.primary + '99' : T.fg3 }}>{q.type}</p>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Trend mini panel */}
            <TrendPanel currentResponders={totalResponders} avgRatingVal={displayAvgRating} clusters={displayClusters} />
          </div>

          {/* Center: result */}
          <div className="xl:col-span-2 flex flex-col gap-4">
            {/* Insight banner */}
            {focusCluster && activeQ?.type === 'openText' && (
              <InsightBanner cluster={focusCluster} totalCount={displayActiveResponses.length} />
            )}

            {/* Commander summary (toggle) */}
            {showSummary && (
              <CommanderSummary session={session} totalResponders={totalResponders}
                activeResponses={displayActiveResponses} clusters={displayClusters}
                avgRating={displayAvgRating} chartData={displayChartData} />
            )}

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

                {displayChartData.length > 0 && (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={displayChartData} layout="vertical" margin={{ left: 0, right: 52, top: 0, bottom: 0 }}>
                        <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: T.fg3, fontSize: 11 }} />
                        <YAxis type="category" dataKey="option" tick={{ fill: T.fg2, fontSize: 12 }} width={170} />
                        <Bar dataKey="pct" radius={[0, 4, 4, 0]}
                          label={{ position: 'right', formatter: (v: unknown) => `${typeof v === 'number' ? v : 0}%`, fill: T.fg1, fontSize: 12, fontWeight: 600 }}>
                          {displayChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-2 flex gap-3 flex-wrap">
                      {displayChartData.map((d, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-[11px]" style={{ color: T.fg2 }}>{d.option}</span>
                          <span className="text-[11px] font-bold" style={{ color: T.fg1 }}>
                            <AnimatedCounter value={d.count} color={T.fg1} size={11} /> คน
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {displayAvgRating !== null && <RatingDisplay avg={displayAvgRating} count={displayActiveResponses.length} />}

                {activeQ.type === 'openText' && displayActiveResponses.length > 0 && (
                  <div className="mt-2">
                    <Stencil color={T.fg3} className="mb-2">
                      ความคิดเห็นล่าสุด
                      {displayActiveResponses.length > 0 && (
                        <span className="ml-2 font-normal" style={{ color: T.success }}>
                          ({displayActiveResponses.length} ความคิดเห็น)
                        </span>
                      )}
                    </Stencil>
                    <LiveFeed responses={displayActiveResponses} />
                  </div>
                )}

                {displayActiveResponses.length === 0 && (
                  <div className="mt-2 rounded-2xl px-4 py-6 text-center"
                    style={{ background: T.surfaceLight, border: `1px solid ${T.border}` }}>
                    <MIcon name="inbox" size={28} color={T.fg3} />
                    <p className="mt-2 text-[13px] font-semibold" style={{ color: T.fg2 }}>
                      Waiting for responses
                    </p>
                  </div>
                )}
              </Card>
            ) : (
              <Card padding={24} className="flex flex-col items-center gap-3">
                <MIcon name="hourglass_empty" size={40} color={T.fg3} />
                <p style={{ color: T.fg3 }}>ยังไม่มีคำถาม</p>
              </Card>
            )}

            {/* Response counters */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'ตอบแล้ว',   value: displayActiveResponses.length, color: T.success },
                { label: 'คนทั้งหมด', value: totalResponders,         color: T.fg1 },
                { label: '% ตอบ',     value: displayRespPct,          color: T.primary, suffix: '%' },
              ].map(s => (
                <Card key={s.label} padding={14} className="flex flex-col items-center">
                  <Stencil>{s.label}</Stencil>
                  <div className="mt-1">
                    <AnimatedCounter value={s.value} color={s.color} size={36} suffix={s.suffix} animate={animEnabled} />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Right: bubble cloud + QR */}
          <div className="xl:col-span-1 flex flex-col gap-4">
            {activeQ?.type === 'openText' && displayClusters.length > 0 ? (
              <Card padding={16}>
                <div className="flex items-center justify-between mb-2">
                  <Stencil color={T.accentPurple}>Theme Clusters</Stencil>
                  <span className="text-[10px]" style={{ color: T.fg3 }}>{displayClusters.length} themes</span>
                </div>
                <BubbleCloud clusters={displayClusters} selected={selectedCluster}
                  onSelect={setSelectedCluster} focusId={focusCluster?.clusterId} animate={animEnabled} />
                <div className="flex flex-col gap-2 mt-3">
                  {displayClusters.map(cl => {
                    const color  = CAT_COLOR[cl.category] ?? T.accentPurple
                    const active = selectedCluster?.clusterId === cl.clusterId
                    const issued = issuedIds.has(cl.clusterId)
                    const focus  = cl.clusterId === focusCluster?.clusterId && !active
                    return (
                      <div key={cl.clusterId}
                        onClick={() => setSelectedCluster(active ? null : cl)}
                        className="p-2.5 rounded-xl cursor-pointer hover:bg-white/5 transition-colors"
                        style={{ background: active ? color + '18' : T.surfaceLight, border: `1px solid ${active ? color + '60' : focus ? color + '40' : T.border}` }}>
                        <div className="flex items-center justify-between">
                          <p className="text-[12px] font-semibold truncate" style={{ color: T.fg1 }}>
                            {focus && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 mb-0.5"
                              style={{ background: color, verticalAlign: 'middle' }} />}
                            {cl.themeTitle}
                          </p>
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
                    <ClusterDetail cluster={selectedCluster} onCreateIssue={handleCreateIssue}
                      onClose={() => setSelectedCluster(null)} issuedIds={issuedIds} />
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
