import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { T } from '../tokens'
import { Card, StatTile, Stencil, MIcon, HUDGrid, Chip, StatusBadge, PrimaryBtn, GhostBtn } from '../components/ui'
import { getCourses } from '../services/courseService'
import { getAllBatches } from '../services/batchService'
import { getAllSessions } from '../services/liveSessionService'
import { getAllIssues } from '../services/issueService'
import type { Course, Batch, LiveSession, Issue } from '../models'
import { fmtDate } from '../utils/dateFormat'

export default function InstructorDashboard() {
  const nav = useNavigate()
  const [courses, setCourses] = useState<Course[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [issues, setIssues] = useState<Issue[]>([])

  useEffect(() => {
    getCourses().then(setCourses)
    getAllBatches().then(setBatches)
    getAllSessions().then(setSessions)
    getAllIssues().then(setIssues)
  }, [])

  const activeSessions = sessions.filter(s => s.status === 'active')
  const openIssues = issues.filter(i => i.status === 'open' || i.status === 'inProgress')
  const p1Issues = issues.filter(i => i.severity === 'P1' && i.status !== 'resolved' && i.status !== 'ignored')

  return (
    <div className="relative min-h-screen p-6" style={{ background: T.bg }}>
      <HUDGrid />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-8">
        <div>
          <Stencil color={T.primary}>Instructor Dashboard</Stencil>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight" style={{ color: T.fg1 }}>
            Signal AAR — Live & Improvement
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.fg3 }}>ระบบ AAR สด และการติดตามการพัฒนาหลักสูตร</p>
        </div>
        <PrimaryBtn onClick={() => nav('/sessions/new')} icon="add">
          สร้าง Session ใหม่
        </PrimaryBtn>
      </div>

      {/* KPI strip */}
      <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatTile label="หลักสูตรทั้งหมด" value={courses.length} icon="school" color={T.accentBlue} />
        <StatTile label="Sessions ทั้งหมด" value={sessions.length} icon="event_note" color={T.primary} />
        <StatTile label="Issues เปิดอยู่" value={openIssues.length} icon="bug_report" color={T.warning} />
        <StatTile label="P1 Critical" value={p1Issues.length} icon="priority_high" color={T.error} />
      </div>

      <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active sessions */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <Stencil color={T.success}>Sessions ล่าสุด</Stencil>
              <GhostBtn onClick={() => nav('/sessions')} size="sm" icon="arrow_forward">ดูทั้งหมด</GhostBtn>
            </div>
            {sessions.length === 0 ? (
              <div className="py-10 text-center" style={{ color: T.fg3 }}>ยังไม่มี Session</div>
            ) : (
              <div className="flex flex-col gap-2">
                {sessions.slice(0, 6).map(s => {
                  const course = courses.find(c => c.courseId === s.courseId)
                  const batch = batches.find(b => b.batchId === s.batchId)
                  return (
                    <div
                      key={s.sessionId}
                      onClick={() => nav(`/sessions/${s.sessionId}/dashboard`)}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-white/5 transition-colors"
                      style={{ border: `1px solid ${T.border}` }}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: T.primary + '1F' }}
                      >
                        <MIcon name="event_note" size={18} color={T.primary} fill={1} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate" style={{ color: T.fg1 }}>{s.title}</p>
                        <p className="text-[11px]" style={{ color: T.fg3 }}>
                          {course?.name ?? s.courseId} · {batch?.batchName ?? s.batchId}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={s.status} />
                        <span className="text-[11px] font-mono" style={{ color: T.fg3 }}>{fmtDate(s.createdAt)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Courses */}
          <Card>
            <Stencil color={T.accentBlue} className="mb-3">หลักสูตร</Stencil>
            <div className="flex flex-col gap-2">
              {courses.map(c => {
                const cb = batches.filter(b => b.courseId === c.courseId)
                return (
                  <div key={c.courseId} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: T.surfaceLight }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: T.accentBlue + '20' }}>
                      <MIcon name="school" size={16} color={T.accentBlue} fill={1} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold truncate" style={{ color: T.fg1 }}>{c.name}</p>
                      <p className="text-[10px]" style={{ color: T.fg3 }}>{cb.length} รุ่น · {c.department}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* P1 issues alert */}
          {p1Issues.length > 0 && (
            <Card accent={T.error + '66'} glow={T.error}>
              <Stencil color={T.error} className="mb-2">P1 Critical Issues</Stencil>
              <div className="flex flex-col gap-2">
                {p1Issues.slice(0, 3).map(i => (
                  <div
                    key={i.issueId}
                    onClick={() => nav('/issues')}
                    className="flex items-start gap-2 cursor-pointer"
                  >
                    <MIcon name="priority_high" size={14} color={T.error} className="mt-0.5 shrink-0" />
                    <p className="text-[12px]" style={{ color: T.fg1 }}>{i.title}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => nav('/issues')}
                className="mt-3 text-[11px] font-semibold flex items-center gap-1"
                style={{ color: T.error }}
              >
                ดู Issues ทั้งหมด <MIcon name="arrow_forward" size={13} color={T.error} />
              </button>
            </Card>
          )}

          {/* Quick join code */}
          {activeSessions.length > 0 && (
            <Card accent={T.success + '66'} glow={T.success}>
              <Stencil color={T.success} className="mb-2">Session กำลังใช้งาน</Stencil>
              {activeSessions.slice(0, 1).map(s => (
                <div key={s.sessionId}>
                  <p className="text-[13px] font-semibold mb-2" style={{ color: T.fg1 }}>{s.title}</p>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[22px] font-bold tracking-[6px]" style={{ color: T.success }}>{s.joinCode}</span>
                    <Chip color={T.success} icon="wifi">Join Code</Chip>
                  </div>
                  <PrimaryBtn
                    onClick={() => nav(`/sessions/${s.sessionId}/dashboard`)}
                    icon="open_in_full"
                    size="sm"
                    className="mt-3"
                  >
                    เปิด Dashboard
                  </PrimaryBtn>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
