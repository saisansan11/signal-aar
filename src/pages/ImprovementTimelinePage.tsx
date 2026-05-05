import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, ReferenceLine } from 'recharts'
import { T } from '../tokens'
import { Card, Stencil, MIcon, HUDGrid, Chip, SeverityBadge, StatTile } from '../components/ui'
import { getAllIssues, getAllActions, getAllImpactRecords } from '../services/issueService'
import { getAllBatches } from '../services/batchService'
import type { Issue, Action, ImpactRecord, Batch } from '../models'

export default function ImprovementTimelinePage() {
  const [issues, setIssues] = useState<Issue[]>([])
  const [actions, setActions] = useState<Action[]>([])
  const [impacts, setImpacts] = useState<ImpactRecord[]>([])
  const [batches, setBatches] = useState<Batch[]>([])

  useEffect(() => {
    getAllIssues().then(setIssues)
    getAllActions().then(setActions)
    getAllImpactRecords().then(setImpacts)
    getAllBatches().then(setBatches)
  }, [])

  const batchScores = batches.slice(0, 4).map((b, i) => ({
    name: b.batchName,
    score: [58, 64, 71, 78][i] ?? 75,
    issues: [18, 22, 16, 19][i] ?? 15,
  }))

  const resolvedIssues = issues.filter(i => i.status === 'resolved')
  const totalDelta = impacts.reduce((s, im) => s + (im.afterScore - im.beforeScore), 0)

  return (
    <div className="relative min-h-screen p-6" style={{ background: T.bg }}>
      <HUDGrid />
      <div className="relative">
        {/* Header */}
        <div className="mb-8">
          <Stencil color={T.primary}>Improvement Analytics</Stencil>
          <h1 className="mt-1 text-[22px] font-bold" style={{ color: T.fg1 }}>
            Cross-Batch Improvement Tracking
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.fg3 }}>ติดตามการพัฒนาหลักสูตรข้ามรุ่น — Before / After</p>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatTile label="Issues แก้ไขแล้ว" value={resolvedIssues.length} icon="task_alt" color={T.success} />
          <StatTile label="Actions เสร็จสิ้น" value={actions.filter(a => a.status === 'done').length} icon="check_circle" color={T.accentBlue} />
          <StatTile label="Impact บันทึกแล้ว" value={impacts.length} icon="trending_up" color={T.primary} />
          <StatTile label="คะแนนเพิ่มรวม" value={`+${totalDelta}`} suffix="pts" icon="bar_chart" color={T.success} delta={totalDelta} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          {/* Trend chart */}
          <Card padding={20}>
            <Stencil color={T.primary} className="mb-4">แนวโน้มคะแนนตามรุ่น</Stencil>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={batchScores} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: T.fg2, fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fill: T.fg3, fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8 }}
                  labelStyle={{ color: T.fg1 }}
                  itemStyle={{ color: T.primary }}
                />
                <ReferenceLine y={60} stroke={T.warning} strokeDasharray="4 4" />
                <Bar dataKey="score" radius={[4, 4, 0, 0]} name="คะแนน">
                  {batchScores.map((_b, i) => (
                    <Cell key={i} fill={i === batchScores.length - 1 ? T.primary : T.accentBlue + '99'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-around mt-2">
              {batchScores.map((b, i) => (
                <div key={i} className="text-center">
                  <p className="text-[11px]" style={{ color: T.fg3 }}>ISSUES</p>
                  <p className="text-[14px] font-bold" style={{ color: T.warning }}>{b.issues}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Before / After comparison */}
          <Card padding={20}>
            <Stencil color={T.success} className="mb-4">Before / After — Impact บันทึก</Stencil>
            <div className="flex flex-col gap-3">
              {impacts.map(im => {
                const issue = issues.find(i => i.issueId === im.issueId)
                const delta = im.afterScore - im.beforeScore
                const beforeBatch = batches.find(b => b.batchId === im.beforeBatchId)
                const afterBatch = batches.find(b => b.batchId === im.afterBatchId)
                return (
                  <div key={im.impactId} className="p-3 rounded-xl" style={{ background: T.surfaceLight }}>
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-[12px] font-semibold" style={{ color: T.fg1 }}>
                        {issue?.title ?? im.issueId}
                      </p>
                      <Chip color={delta >= 10 ? T.success : T.warning} size={10}>+{delta} pts</Chip>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-[10px]" style={{ color: T.fg3 }}>{beforeBatch?.batchName ?? im.beforeBatchId} (ก่อน)</p>
                        <p className="text-[20px] font-bold" style={{ color: T.fg2 }}>{im.beforeScore}%</p>
                      </div>
                      <MIcon name="arrow_forward" size={20} color={T.success} />
                      <div className="flex-1">
                        <p className="text-[10px]" style={{ color: T.fg3 }}>{afterBatch?.batchName ?? im.afterBatchId} (หลัง)</p>
                        <p className="text-[20px] font-bold" style={{ color: T.success }}>{im.afterScore}%</p>
                      </div>
                    </div>
                    <p className="text-[11px] mt-2" style={{ color: T.fg3 }}>{im.improvementSummary}</p>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Issue timeline */}
        <Card padding={20}>
          <Stencil color={T.primary} className="mb-6">Timeline — Issues → Actions → Results</Stencil>
          <div className="flex flex-col gap-0">
            {resolvedIssues.map((issue, idx) => {
              const issueActions = actions.filter(a => a.issueId === issue.issueId)
              const impact = impacts.find(im => im.issueId === issue.issueId)
              const isLast = idx === resolvedIssues.length - 1
              return (
                <div key={issue.issueId} className="flex gap-4">
                  {/* Timeline column */}
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center border-2"
                      style={{ background: T.success + '20', borderColor: T.success }}>
                      <MIcon name="task_alt" size={16} color={T.success} fill={1} />
                    </div>
                    {!isLast && <div className="w-0.5 flex-1 my-1" style={{ background: T.border }} />}
                  </div>

                  {/* Content */}
                  <div className={`flex-1 pb-6 ${isLast ? '' : ''}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <SeverityBadge severity={issue.severity} />
                          <span className="text-[10px] font-mono" style={{ color: T.fg3 }}>{issue.issueId}</span>
                        </div>
                        <p className="text-[14px] font-semibold" style={{ color: T.fg1 }}>{issue.title}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: T.fg3 }}>
                          {batches.find(b => b.batchId === issue.batchId)?.batchName ?? issue.batchId} · {issue.frequencyCount} คน ({issue.percentage}%)
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    {issueActions.length > 0 && (
                      <div className="ml-4 border-l-2 pl-4 flex flex-col gap-2 mb-3" style={{ borderColor: T.primary + '60' }}>
                        {issueActions.map(a => (
                          <div key={a.actionId}>
                            <p className="text-[12px] font-medium" style={{ color: T.primary }}>
                              ⚡ {a.description}
                            </p>
                            <p className="text-[10px]" style={{ color: T.fg3 }}>{a.responsiblePerson} · {a.dueDate}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Impact */}
                    {impact && (
                      <div className="inline-flex items-center gap-3 px-3 py-2 rounded-xl"
                        style={{ background: T.success + '15', border: `1px solid ${T.success}40` }}>
                        <MIcon name="trending_up" size={16} color={T.success} fill={1} />
                        <span className="text-[12px] font-semibold" style={{ color: T.success }}>
                          {impact.beforeScore}% → {impact.afterScore}% (+{impact.afterScore - impact.beforeScore} pts)
                        </span>
                        <span className="text-[11px]" style={{ color: T.fg3 }}>
                          {batches.find(b => b.batchId === impact.afterBatchId)?.batchName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
