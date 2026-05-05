import { useEffect, useState } from 'react'
import { T } from '../tokens'
import { Card, Stencil, MIcon, HUDGrid, SeverityBadge, StatusBadge, Chip, PrimaryBtn, GhostBtn } from '../components/ui'
import { getAllIssues, getAllActions, updateIssueStatus, createAction } from '../services/issueService'
import { getAllBatches } from '../services/batchService'
import type { Issue, Action, IssueStatus, Batch } from '../models'
import { fmtDate } from '../utils/dateFormat'

const COLUMNS: { status: IssueStatus; label: string; color: string }[] = [
  { status: 'open', label: 'Open — รอดำเนินการ', color: T.error },
  { status: 'inProgress', label: 'In Progress — กำลังดำเนินการ', color: T.warning },
  { status: 'resolved', label: 'Resolved — แก้ไขแล้ว', color: T.success },
  { status: 'ignored', label: 'Ignored — ยกเว้น', color: T.fg3 },
]

const CAT_COLOR: Record<string, string> = {
  EQUIP: T.error, TIME: T.warning, INSTR: T.es, DOC: T.info,
  CURR: T.spectrum, ASSESS: T.ep, LOC: T.drone, SAFE: T.radar, OTHER: T.fg3,
}

export default function IssueTrackerPage() {
  const [issues, setIssues] = useState<Issue[]>([])
  const [actions, setActions] = useState<Action[]>([])

  const [batches, setBatches] = useState<Batch[]>([])
  const [selected, setSelected] = useState<Issue | null>(null)
  const [filterSev, setFilterSev] = useState<string>('all')
  const [showActionForm, setShowActionForm] = useState(false)
  const [actionDesc, setActionDesc] = useState('')
  const [actionPerson, setActionPerson] = useState('')
  const [actionDue, setActionDue] = useState('')

  useEffect(() => {
    getAllIssues().then(setIssues)
    getAllActions().then(setActions)
    getAllBatches().then(setBatches)
  }, [])

  async function moveIssue(issue: Issue, newStatus: IssueStatus) {
    await updateIssueStatus(issue.issueId, newStatus)
    setIssues(is => is.map(i => i.issueId === issue.issueId ? { ...i, status: newStatus } : i))
    if (selected?.issueId === issue.issueId) setSelected(s => s ? { ...s, status: newStatus } : s)
  }

  async function addAction() {
    if (!selected || !actionDesc.trim()) return
    const a = await createAction({
      issueId: selected.issueId,
      description: actionDesc,
      responsiblePerson: actionPerson,
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: actionDue,
      status: 'pending',
      evidenceNote: '',
    })
    setActions(as => [...as, a])
    setShowActionForm(false)
    setActionDesc('')
    setActionPerson('')
    setActionDue('')
  }

  const filtered = issues.filter(i => filterSev === 'all' || i.severity === filterSev)

  const openCount = issues.filter(i => i.status === 'open').length
  const inProgCount = issues.filter(i => i.status === 'inProgress').length
  const resolvedCount = issues.filter(i => i.status === 'resolved').length
  const p1Count = issues.filter(i => i.severity === 'P1' && i.status !== 'resolved' && i.status !== 'ignored').length

  const selectedActions = actions.filter(a => a.issueId === selected?.issueId)

  return (
    <div className="relative min-h-screen" style={{ background: T.bg }}>
      <HUDGrid />
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Stencil color={T.primary}>Issue & Action Tracker</Stencil>
            <h1 className="mt-1 text-[22px] font-bold" style={{ color: T.fg1 }}>
              Issues & Actions — {issues.length} รายการ
            </h1>
          </div>
          <div className="flex gap-2">
            {['all', 'P1', 'P2', 'P3'].map(s => (
              <button
                key={s}
                onClick={() => setFilterSev(s)}
                className="px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all"
                style={{
                  background: filterSev === s ? T.primary + '20' : T.surfaceLight,
                  color: filterSev === s ? T.primary : T.fg2,
                  border: `1px solid ${filterSev === s ? T.primary + '60' : T.border}`,
                }}
              >
                {s === 'all' ? 'ทุก Priority' : s}
              </button>
            ))}
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Open', value: openCount, color: T.error, icon: 'inbox' },
            { label: 'In Progress', value: inProgCount, color: T.warning, icon: 'pending' },
            { label: 'Resolved', value: resolvedCount, color: T.success, icon: 'check_circle' },
            { label: 'P1 Critical', value: p1Count, color: T.error, icon: 'priority_high' },
          ].map(k => (
            <Card key={k.label} padding={14} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: k.color + '20' }}>
                <MIcon name={k.icon} size={18} color={k.color} fill={1} />
              </div>
              <div>
                <p className="text-[24px] font-bold leading-none" style={{ color: k.color }}>{k.value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: T.fg3 }}>{k.label}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Kanban board */}
          <div className="flex-1 grid grid-cols-2 xl:grid-cols-4 gap-4 overflow-x-auto">
            {COLUMNS.map(col => {
              const colIssues = filtered.filter(i => i.status === col.status)
              return (
                <div key={col.status} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                      <Stencil color={col.color}>{col.status === 'open' ? 'Open' : col.status === 'inProgress' ? 'In Progress' : col.status === 'resolved' ? 'Resolved' : 'Ignored'}</Stencil>
                    </div>
                    <span className="text-[11px] font-mono" style={{ color: T.fg3 }}>{colIssues.length}</span>
                  </div>

                  {colIssues.length === 0 && (
                    <div className="py-6 flex flex-col items-center gap-2 rounded-xl" style={{ border: `1px dashed ${T.border}` }}>
                      <MIcon name="inbox" size={20} color={T.fg3} />
                      <p className="text-[11px]" style={{ color: T.fg3 }}>ว่าง</p>
                    </div>
                  )}

                  {colIssues.map(issue => {
                    const batch = batches.find(b => b.batchId === issue.batchId)
                    const issueActions = actions.filter(a => a.issueId === issue.issueId)
                    return (
                      <div
                        key={issue.issueId}
                        onClick={() => setSelected(selected?.issueId === issue.issueId ? null : issue)}
                        className="p-3 rounded-2xl cursor-pointer hover:scale-[1.01] transition-all"
                        style={{
                          background: selected?.issueId === issue.issueId ? T.cardElevated : T.card,
                          border: `1px solid ${selected?.issueId === issue.issueId ? col.color + '80' : T.border}`,
                          boxShadow: selected?.issueId === issue.issueId ? `0 4px 16px ${col.color}30` : undefined,
                        }}
                      >
                        <div className="flex items-start justify-between gap-1 mb-2">
                          <SeverityBadge severity={issue.severity} />
                          <span className="text-[10px] font-mono" style={{ color: T.fg3 }}>{issue.issueId}</span>
                        </div>
                        <p className="text-[12px] font-semibold mb-2" style={{ color: T.fg1 }}>{issue.title}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Chip color={CAT_COLOR[issue.category] ?? T.fg3} size={10}>{issue.category}</Chip>
                          <span className="text-[10px]" style={{ color: T.fg3 }}>
                            {batch?.batchName ?? issue.batchId}
                          </span>
                          {issueActions.length > 0 && (
                            <Chip color={T.success} size={10} icon="task_alt">{issueActions.length}</Chip>
                          )}
                        </div>

                        {/* Quick status move */}
                        <div className="flex gap-1 mt-2">
                          {COLUMNS.filter(c => c.status !== col.status).slice(0, 2).map(c => (
                            <button
                              key={c.status}
                              onClick={e => { e.stopPropagation(); moveIssue(issue, c.status) }}
                              className="text-[10px] px-2 py-0.5 rounded-lg hover:opacity-80 transition-opacity"
                              style={{ background: c.color + '20', color: c.color, border: `1px solid ${c.color}40` }}
                            >
                              → {c.status === 'inProgress' ? 'In Progress' : c.status === 'resolved' ? 'Resolved' : c.status}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="w-80 shrink-0">
              <Card padding={20} className="sticky top-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="font-mono text-[11px]" style={{ color: T.fg3 }}>{selected.issueId}</span>
                    <StatusBadge status={selected.status} />
                  </div>
                  <button onClick={() => setSelected(null)}>
                    <MIcon name="close" size={18} color={T.fg3} />
                  </button>
                </div>
                <h3 className="text-[15px] font-bold mb-3" style={{ color: T.fg1 }}>{selected.title}</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  <SeverityBadge severity={selected.severity} />
                  <Chip color={CAT_COLOR[selected.category] ?? T.fg3} size={10}>{selected.category}</Chip>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="p-2 rounded-lg" style={{ background: T.surfaceLight }}>
                    <p className="text-[10px]" style={{ color: T.fg3 }}>นักเรียนพูดถึง</p>
                    <p className="text-[16px] font-bold" style={{ color: T.error }}>{selected.frequencyCount} คน</p>
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: T.surfaceLight }}>
                    <p className="text-[10px]" style={{ color: T.fg3 }}>คิดเป็น</p>
                    <p className="text-[16px] font-bold" style={{ color: T.warning }}>{selected.percentage}%</p>
                  </div>
                </div>
                <p className="text-[11px] mb-4" style={{ color: T.fg3 }}>สร้างเมื่อ {fmtDate(selected.createdAt)}</p>

                {/* Actions */}
                <Stencil color={T.primary} className="mb-2">Actions ({selectedActions.length})</Stencil>
                {selectedActions.map(a => (
                  <div key={a.actionId} className="p-2.5 rounded-xl mb-2" style={{ background: T.surfaceLight }}>
                    <p className="text-[12px] font-semibold" style={{ color: T.fg1 }}>{a.description}</p>
                    <p className="text-[10px] mt-1" style={{ color: T.fg3 }}>{a.responsiblePerson} · Due {fmtDate(a.dueDate)}</p>
                    <StatusBadge status={a.status} />
                  </div>
                ))}

                {!showActionForm ? (
                  <PrimaryBtn onClick={() => setShowActionForm(true)} icon="add" size="sm" className="w-full mt-2">
                    เพิ่ม Action
                  </PrimaryBtn>
                ) : (
                  <div className="mt-3 flex flex-col gap-2">
                    <textarea
                      value={actionDesc}
                      onChange={e => setActionDesc(e.target.value)}
                      placeholder="รายละเอียดการแก้ไข..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl text-[12px] outline-none resize-none"
                      style={{ background: T.surfaceLight, border: `1px solid ${T.border}`, color: T.fg1 }}
                    />
                    <input
                      value={actionPerson}
                      onChange={e => setActionPerson(e.target.value)}
                      placeholder="ผู้รับผิดชอบ"
                      className="px-3 py-2 rounded-xl text-[12px] outline-none"
                      style={{ background: T.surfaceLight, border: `1px solid ${T.border}`, color: T.fg1 }}
                    />
                    <input
                      type="date"
                      value={actionDue}
                      onChange={e => setActionDue(e.target.value)}
                      className="px-3 py-2 rounded-xl text-[12px] outline-none"
                      style={{ background: T.surfaceLight, border: `1px solid ${T.border}`, color: T.fg1 }}
                    />
                    <div className="flex gap-2">
                      <PrimaryBtn onClick={addAction} size="sm">บันทึก</PrimaryBtn>
                      <GhostBtn onClick={() => setShowActionForm(false)} size="sm">ยกเลิก</GhostBtn>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
