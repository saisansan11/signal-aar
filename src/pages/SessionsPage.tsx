import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { T } from '../tokens'
import { Card, Stencil, MIcon, HUDGrid, StatusBadge, PrimaryBtn, GhostBtn } from '../components/ui'
import { getAllSessions } from '../services/liveSessionService'
import { getCourses } from '../services/courseService'
import { getAllBatches } from '../services/batchService'
import type { LiveSession, Course, Batch } from '../models'
import { fmtDateTime } from '../utils/dateFormat'

export default function SessionsPage() {
  const nav = useNavigate()
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'closed' | 'draft'>('all')

  useEffect(() => {
    getAllSessions().then(setSessions)
    getCourses().then(setCourses)
    getAllBatches().then(setBatches)
  }, [])

  const filtered = filter === 'all' ? sessions : sessions.filter(s => s.status === filter)

  return (
    <div className="relative min-h-screen p-6" style={{ background: T.bg }}>
      <HUDGrid />
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Stencil color={T.primary}>AAR Sessions</Stencil>
            <h1 className="mt-1 text-[22px] font-bold" style={{ color: T.fg1 }}>Sessions ทั้งหมด</h1>
          </div>
          <PrimaryBtn onClick={() => nav('/sessions/new')} icon="add">สร้าง Session ใหม่</PrimaryBtn>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['all', 'active', 'draft', 'closed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-xl text-[13px] font-semibold transition-all"
              style={{
                background: filter === f ? T.primary + '20' : T.surfaceLight,
                color: filter === f ? T.primary : T.fg2,
                border: `1px solid ${filter === f ? T.primary + '66' : T.border}`,
              }}
            >
              {f === 'all' ? 'ทั้งหมด' : f === 'active' ? 'กำลังใช้งาน' : f === 'draft' ? 'Draft' : 'ปิดแล้ว'}
              <span className="ml-2 text-[10px]">
                {f === 'all' ? sessions.length : sessions.filter(s => s.status === f).length}
              </span>
            </button>
          ))}
        </div>

        {/* Session grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(s => {
            const course = courses.find(c => c.courseId === s.courseId)
            const batch = batches.find(b => b.batchId === s.batchId)
            return (
              <Card key={s.sessionId} accent={s.status === 'active' ? T.success + '66' : undefined}>
                <div className="flex items-start justify-between mb-3">
                  <StatusBadge status={s.status} />
                  <span className="font-mono text-[11px] px-2 py-1 rounded-lg"
                    style={{ background: T.surfaceLight, color: T.fg3 }}>
                    {s.joinCode}
                  </span>
                </div>
                <h3 className="text-[14px] font-semibold mb-1" style={{ color: T.fg1 }}>{s.title}</h3>
                <p className="text-[12px] mb-3" style={{ color: T.fg3 }}>
                  {course?.name} · {batch?.batchName}
                </p>
                <p className="text-[11px] mb-4" style={{ color: T.fg3 }}>{fmtDateTime(s.createdAt)}</p>
                <div className="flex gap-2">
                  <PrimaryBtn
                    onClick={() => nav(`/sessions/${s.sessionId}/dashboard`)}
                    icon={s.status === 'active' ? 'open_in_full' : 'bar_chart'}
                    size="sm"
                  >
                    {s.status === 'active' ? 'เปิด Dashboard' : 'ดูผล'}
                  </PrimaryBtn>
                  {s.status === 'active' && (
                    <GhostBtn
                      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/join/${s.joinCode}`) }}
                      icon="share" size="sm"
                    >
                      Share
                    </GhostBtn>
                  )}
                </div>
              </Card>
            )
          })}

          {/* New session card */}
          <div
            onClick={() => nav('/sessions/new')}
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
            style={{ borderColor: T.border, minHeight: 160 }}
          >
            <MIcon name="add_circle" size={32} color={T.fg3} />
            <p className="text-[13px] font-medium" style={{ color: T.fg3 }}>สร้าง Session ใหม่</p>
          </div>
        </div>
      </div>
    </div>
  )
}
