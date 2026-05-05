import { useEffect, useMemo, useState } from 'react'
import { T } from '../tokens'
import { Card, Stencil, HUDGrid, PrimaryBtn, GhostBtn } from '../components/ui'
import { getAllSessions } from '../services/liveSessionService'
import { getCourses } from '../services/courseService'
import { getAllBatches } from '../services/batchService'
import { getAllIssues, getAllActions, getAllImpactRecords } from '../services/issueService'
import type { LiveSession, Course, Batch, Issue, Action, ImpactRecord } from '../models'
import { fmtDate } from '../utils/dateFormat'
import logo from '../assets/logo.jpg'

const DEPT_TH = 'แผนกวิชาการสื่อสารประเภทวิทยุและการสงครามอิเล็กทรอนิกส์'
const DEPT_EN = 'RADIO & EW DEPT.'

export default function EvidenceReportPage() {
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [issues, setIssues] = useState<Issue[]>([])
  const [actions, setActions] = useState<Action[]>([])
  const [impacts, setImpacts] = useState<ImpactRecord[]>([])
  const [selectedSession, setSelectedSession] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getAllSessions().then(setSessions)
    getCourses().then(setCourses)
    getAllBatches().then(setBatches)
    getAllIssues().then(setIssues)
    getAllActions().then(setActions)
    getAllImpactRecords().then(setImpacts)
  }, [])

  const session = sessions.find(s => s.sessionId === selectedSession) ?? sessions[0]
  const course = courses.find(c => c.courseId === session?.courseId)
  const batch = batches.find(b => b.batchId === session?.batchId)

  const batchIssues = useMemo(
    () => issues.filter(i => i.batchId === session?.batchId),
    [issues, session?.batchId],
  )
  const sessionActions = useMemo(
    () => actions.filter(a => batchIssues.some(issue => issue.issueId === a.issueId)),
    [actions, batchIssues],
  )
  const sessionImpacts = useMemo(
    () => impacts.filter(im => batchIssues.some(issue => issue.issueId === im.issueId)),
    [impacts, batchIssues],
  )

  function generateText(): string {
    if (!session) return ''

    const issueLines = batchIssues.length
      ? batchIssues.map((issue, index) => `${index + 1}. [${issue.severity}] ${issue.title} (${issue.percentage}%)`).join('\n')
      : '- ไม่มีประเด็นที่บันทึกไว้'

    const actionLines = sessionActions.length
      ? sessionActions.map(action => `- ${action.description} · ${action.responsiblePerson} · ${fmtDate(action.dueDate)}`).join('\n')
      : '- ไม่มีมาตรการที่บันทึกไว้'

    const impactLines = sessionImpacts.length
      ? sessionImpacts.map(impact => {
        const issue = issues.find(i => i.issueId === impact.issueId)
        return `- ${issue?.title ?? impact.issueId}: ${impact.beforeScore}% -> ${impact.afterScore}%`
      }).join('\n')
      : '- ยังไม่มีข้อมูลผลการพัฒนา'

    return [
      `AAR Evidence Report — ${session.title}`,
      `หน่วย: โรงเรียนทหารสื่อสาร / ${DEPT_TH}`,
      `แผนก: ${DEPT_EN}`,
      `หลักสูตร: ${course?.name ?? session.courseId}`,
      `รุ่นที่: ${batch?.batchName ?? session.batchId}`,
      `วันที่: ${fmtDate(session.createdAt)}`,
      '',
      '1. ประเด็นที่พบ',
      issueLines,
      '',
      '2. มาตรการแก้ไข',
      actionLines,
      '',
      '3. ผลการพัฒนา',
      impactLines,
    ].join('\n')
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(generateText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="relative min-h-screen p-6" style={{ background: T.bg }}>
      <HUDGrid />
      <div className="relative max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Stencil color={T.primary}>Evidence Report</Stencil>
            <h1 className="mt-1 text-[22px] font-bold" style={{ color: T.fg1 }}>รายงาน AAR สำหรับการประเมิน</h1>
          </div>
          <div className="flex gap-2">
            <GhostBtn onClick={handleCopy} icon={copied ? 'check' : 'content_copy'}>
              {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
            </GhostBtn>
            <PrimaryBtn onClick={handlePrint} icon="print">พิมพ์ / Export</PrimaryBtn>
          </div>
        </div>

        <Card className="mb-6" padding={16}>
          <Stencil color={T.fg3} className="mb-2">เลือก Session</Stencil>
          <select
            value={selectedSession}
            onChange={e => setSelectedSession(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
            style={{ background: T.surfaceLight, border: `1px solid ${T.border}`, color: T.fg1 }}
          >
            {sessions.map(s => (
              <option key={s.sessionId} value={s.sessionId}>
                {s.title} — {s.joinCode}
              </option>
            ))}
          </select>
        </Card>

        {session && (
          <div
            id="evidence-report-print"
            className="p-10 rounded-2xl"
            style={{ background: '#fff', color: '#0D1117', fontFamily: 'Sarabun, sans-serif' }}
          >
            <header className="flex items-start gap-4 pb-5 mb-5" style={{ borderBottom: '2px solid #0D1117' }}>
              <img
                src={logo}
                alt={DEPT_TH}
                className="rounded-full object-cover"
                style={{ width: 56, height: 56, flexShrink: 0 }}
              />
              <div className="flex-1">
                <p className="text-[11px] tracking-[2px] font-semibold uppercase" style={{ color: '#5a6374' }}>
                  ROYAL THAI ARMY · SIGNAL SCHOOL · {DEPT_EN}
                </p>
                <h1 className="text-[22px] font-bold mt-1">AAR Evidence Report — รายงานผลการพัฒนา</h1>
                <p className="text-[12px] mt-1 font-medium" style={{ color: '#5a6374' }}>
                  {DEPT_TH}
                </p>
                <p className="text-[12px] mt-1" style={{ color: '#5a6374' }}>
                  {session.title} · {batch?.batchName ?? session.batchId} · {fmtDate(session.createdAt)}
                </p>
              </div>
              <div className="text-right text-[11px] font-mono" style={{ color: '#5a6374' }}>
                <div>DOC · AAR-{session.sessionId.slice(0, 8).toUpperCase()}</div>
                <div>CLASS · OFFICIAL</div>
                <div>DATE · {fmtDate(session.createdAt)}</div>
              </div>
            </header>

            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { label: 'หลักสูตร', value: course?.name ?? session.courseId, color: '#0D6FB8' },
                { label: 'รุ่นที่', value: batch?.batchName ?? session.batchId, color: '#3FB950' },
                { label: 'Issues', value: batchIssues.length, color: '#D32F2F' },
                { label: 'Actions', value: sessionActions.length, color: '#FF9500' },
              ].map(item => (
                <div key={item.label} className="p-3 rounded-xl" style={{ border: '1px solid #d0d7de' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#5a6374' }}>{item.label}</p>
                  <p className="text-[16px] font-bold mt-1" style={{ color: item.color }}>{item.value}</p>
                </div>
              ))}
            </div>

            <section className="mb-6">
              <h2 className="text-[14px] font-bold mb-3 uppercase tracking-wide border-b pb-1" style={{ borderColor: '#d0d7de' }}>
                1. ประเด็นที่พบจากการทำ AAR
              </h2>
              <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f6f8fa' }}>
                    {['ลำดับ', 'ประเด็น', 'หมวด', 'Priority', 'ผู้พบ', '%', 'สถานะ'].map(header => (
                      <th key={header} className="px-2 py-2 text-left font-semibold" style={{ color: '#5a6374', border: '1px solid #d0d7de' }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batchIssues.map((issue, index) => (
                    <tr key={issue.issueId} style={{ background: index % 2 === 0 ? '#fff' : '#f6f8fa' }}>
                      <td className="px-2 py-1.5 font-mono" style={{ border: '1px solid #d0d7de' }}>{index + 1}</td>
                      <td className="px-2 py-1.5 font-semibold" style={{ border: '1px solid #d0d7de' }}>{issue.title}</td>
                      <td className="px-2 py-1.5" style={{ border: '1px solid #d0d7de' }}>{issue.category}</td>
                      <td className="px-2 py-1.5" style={{ border: '1px solid #d0d7de' }}>{issue.severity}</td>
                      <td className="px-2 py-1.5" style={{ border: '1px solid #d0d7de' }}>{issue.frequencyCount} คน</td>
                      <td className="px-2 py-1.5" style={{ border: '1px solid #d0d7de' }}>{issue.percentage}%</td>
                      <td className="px-2 py-1.5" style={{ border: '1px solid #d0d7de' }}>{issue.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="mb-6">
              <h2 className="text-[14px] font-bold mb-3 uppercase tracking-wide border-b pb-1" style={{ borderColor: '#d0d7de' }}>
                2. มาตรการแก้ไข
              </h2>
              <div className="flex flex-col gap-2">
                {sessionActions.map((action, index) => {
                  const issue = issues.find(item => item.issueId === action.issueId)
                  return (
                    <div key={action.actionId} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: '#f6f8fa' }}>
                      <span className="font-mono text-[11px] font-bold mt-0.5" style={{ color: '#5a6374' }}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="flex-1">
                        <p className="text-[12px] font-semibold">{action.description}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: '#5a6374' }}>
                          ผู้รับผิดชอบ: {action.responsiblePerson} · กำหนดเสร็จ: {fmtDate(action.dueDate)}
                          {issue ? ` · เพื่อแก้ไข: ${issue.title}` : ''}
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#eef2ff', color: '#3949ab' }}>
                        {action.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>

            {sessionImpacts.length > 0 && (
              <section className="mb-6">
                <h2 className="text-[14px] font-bold mb-3 uppercase tracking-wide border-b pb-1" style={{ borderColor: '#d0d7de' }}>
                  3. ผลการพัฒนา
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {sessionImpacts.map(impact => {
                    const issue = issues.find(item => item.issueId === impact.issueId)
                    const beforeBatch = batches.find(item => item.batchId === impact.beforeBatchId)
                    const afterBatch = batches.find(item => item.batchId === impact.afterBatchId)
                    const delta = impact.afterScore - impact.beforeScore

                    return (
                      <div key={impact.impactId} className="p-4 rounded-xl" style={{ border: '1px solid #d0d7de' }}>
                        <p className="text-[12px] font-bold mb-2">{issue?.title ?? impact.issueId}</p>
                        <div className="flex items-center gap-2">
                          <div className="text-center">
                            <p className="text-[10px]" style={{ color: '#5a6374' }}>{beforeBatch?.batchName}</p>
                            <p className="text-[20px] font-bold" style={{ color: '#5a6374' }}>{impact.beforeScore}%</p>
                          </div>
                          <span className="text-[16px]">→</span>
                          <div className="text-center">
                            <p className="text-[10px]" style={{ color: '#5a6374' }}>{afterBatch?.batchName}</p>
                            <p className="text-[20px] font-bold" style={{ color: '#2e7d32' }}>{impact.afterScore}%</p>
                          </div>
                          <div className="ml-auto px-2 py-1 rounded-full text-[12px] font-bold" style={{ background: '#e8f5e9', color: '#2e7d32' }}>
                            +{delta} pts
                          </div>
                        </div>
                        <p className="text-[10px] mt-2" style={{ color: '#5a6374' }}>{impact.improvementSummary}</p>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            <footer className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid #d0d7de' }}>
              <p className="text-[11px]" style={{ color: '#5a6374' }}>
                ออกโดย: Signal AAR System · {DEPT_EN}
              </p>
              <p className="text-[11px] font-mono" style={{ color: '#5a6374' }}>{fmtDate(new Date().toISOString())}</p>
            </footer>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body > * { display: none !important; }
          #evidence-report-print { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>
    </div>
  )
}
