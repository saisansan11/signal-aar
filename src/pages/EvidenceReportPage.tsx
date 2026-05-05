import { useEffect, useState } from 'react'
import { T } from '../tokens'
import { Card, Stencil, HUDGrid, PrimaryBtn, GhostBtn } from '../components/ui'
import { getAllSessions } from '../services/liveSessionService'
import { getCourses } from '../services/courseService'
import { getAllBatches } from '../services/batchService'
import { getAllIssues, getAllActions, getAllImpactRecords } from '../services/issueService'
import type { LiveSession, Course, Batch, Issue, Action, ImpactRecord } from '../models'
import { fmtDate } from '../utils/dateFormat'

export default function EvidenceReportPage() {
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [issues, setIssues] = useState<Issue[]>([])
  const [actions, setActions] = useState<Action[]>([])
  const [impacts, setImpacts] = useState<ImpactRecord[]>([])
  const [selectedSession, setSelectedSession] = useState<string>('')
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
  const sessionIssues = issues.filter(i => i.sourceSessionId === session?.sessionId)
  const allSessionIssues = issues.filter(i => i.batchId === session?.batchId)
  const resolvedIssues = allSessionIssues.filter(i => i.status === 'resolved')
  const p1Issues = allSessionIssues.filter(i => i.severity === 'P1')

  function generateText(): string {
    if (!session) return ''
    return `AAR Evidence Report — ${session.title}
หน่วย: โรงเรียนทหารสื่อสาร / แผนกวิชา EW
หลักสูตร: ${course?.name ?? session.courseId}
รุ่นที่: ${batch?.batchName ?? session.batchId}
วันที่: ${fmtDate(session.createdAt)}
เอกสารอ้างอิง: AAR-${session.sessionId.toUpperCase()}

1. บทสรุป
การทำ AAR ครั้งนี้ได้รับข้อเสนอแนะจากผู้รับการฝึก ${sessionIssues.length} ประเด็น
มีปัญหาระดับ P1: ${p1Issues.length} รายการ
ปัญหาที่ได้รับการแก้ไขแล้ว: ${resolvedIssues.length} รายการ

2. ประเด็นสำคัญที่พบ
${allSessionIssues.map((i, n) => `${n + 1}. [${i.severity}] ${i.title} — ${i.frequencyCount} คน (${i.percentage}%)`).join('\n')}

3. มาตรการแก้ไข
${actions.map(a => `• ${a.description} — ผู้รับผิดชอบ: ${a.responsiblePerson} — กำหนด: ${fmtDate(a.dueDate)} [${a.status}]`).join('\n')}

4. ผลการพัฒนา (Impact)
${impacts.map(im => {
  const issue = issues.find(i => i.issueId === im.issueId)
  return `• ${issue?.title ?? im.issueId}: ${im.beforeScore}% → ${im.afterScore}% (+${im.afterScore - im.beforeScore} pts)`
}).join('\n')}

สรุปโดยรวม: การพัฒนาหลักสูตรโดยใช้ระบบ AAR ช่วยให้คะแนนผู้รับการฝึกเพิ่มขึ้นอย่างต่อเนื่อง
`
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(generateText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handlePrint() { window.print() }

  return (
    <div className="relative min-h-screen p-6" style={{ background: T.bg }}>
      <HUDGrid />
      <div className="relative max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Stencil color={T.primary}>Evidence Report</Stencil>
            <h1 className="mt-1 text-[22px] font-bold" style={{ color: T.fg1 }}>รายงาน AAR สำหรับการประเมิน</h1>
          </div>
          <div className="flex gap-2">
            <GhostBtn onClick={handleCopy} icon={copied ? 'check' : 'content_copy'}>
              {copied ? 'คัดลอกแล้ว!' : 'คัดลอก'}
            </GhostBtn>
            <PrimaryBtn onClick={handlePrint} icon="print">พิมพ์ / Export</PrimaryBtn>
          </div>
        </div>

        {/* Session selector */}
        <Card className="mb-6" padding={16}>
          <Stencil color={T.fg3} className="mb-2">เลือก Session</Stencil>
          <select
            value={selectedSession}
            onChange={e => setSelectedSession(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
            style={{ background: T.surfaceLight, border: `1px solid ${T.border}`, color: T.fg1 }}
          >
            {sessions.map(s => <option key={s.sessionId} value={s.sessionId}>{s.title} — {s.joinCode}</option>)}
          </select>
        </Card>

        {/* Report preview */}
        {session && (
          <div
            id="evidence-report-print"
            className="p-10 rounded-2xl"
            style={{ background: '#fff', color: '#0D1117', fontFamily: 'Sarabun, sans-serif' }}
          >
            {/* Doc header */}
            <header className="flex items-start gap-4 pb-5 mb-5" style={{ borderBottom: '2px solid #0D1117' }}>
              <CrestMark size={56} />
              <div className="flex-1">
                <p className="text-[11px] tracking-[2px] font-semibold uppercase" style={{ color: '#5a6374' }}>
                  ROYAL THAI ARMY · SIGNAL SCHOOL · แผนกวิชา EW
                </p>
                <h1 className="text-[22px] font-bold mt-1">AAR Evidence Report — รายงานผลการพัฒนา</h1>
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

            {/* KPI strip */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { l: 'หลักสูตร', v: course?.name ?? session.courseId, c: '#0D6FB8' },
                { l: 'รุ่นที่', v: batch?.batchName ?? session.batchId, c: '#3FB950' },
                { l: 'Issues พบ', v: allSessionIssues.length, c: '#D32F2F' },
                { l: 'Actions แก้ไข', v: resolvedIssues.length, c: '#FF9500' },
              ].map((k, i) => (
                <div key={i} className="p-3 rounded-xl" style={{ border: '1px solid #d0d7de' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#5a6374' }}>{k.l}</p>
                  <p className="text-[16px] font-bold mt-1" style={{ color: k.c }}>{k.v}</p>
                </div>
              ))}
            </div>

            {/* Issues table */}
            <section className="mb-6">
              <h2 className="text-[14px] font-bold mb-3 uppercase tracking-wide border-b pb-1" style={{ borderColor: '#d0d7de' }}>
                1. ประเด็นที่พบจากการทำ AAR
              </h2>
              <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f6f8fa' }}>
                    {['ลำดับ', 'ประเด็น', 'หมวด', 'Priority', 'ผู้พบ', '%', 'สถานะ'].map(h => (
                      <th key={h} className="px-2 py-2 text-left font-semibold" style={{ color: '#5a6374', border: '1px solid #d0d7de' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allSessionIssues.map((issue, i) => (
                    <tr key={issue.issueId} style={{ background: i % 2 === 0 ? '#fff' : '#f6f8fa' }}>
                      <td className="px-2 py-1.5 font-mono" style={{ border: '1px solid #d0d7de' }}>{i + 1}</td>
                      <td className="px-2 py-1.5 font-semibold" style={{ border: '1px solid #d0d7de' }}>{issue.title}</td>
                      <td className="px-2 py-1.5" style={{ border: '1px solid #d0d7de' }}>{issue.category}</td>
                      <td className="px-2 py-1.5" style={{ border: '1px solid #d0d7de' }}>{issue.severity}</td>
                      <td className="px-2 py-1.5" style={{ border: '1px solid #d0d7de' }}>{issue.frequencyCount} คน</td>
                      <td className="px-2 py-1.5" style={{ border: '1px solid #d0d7de' }}>{issue.percentage}%</td>
                      <td className="px-2 py-1.5" style={{ border: '1px solid #d0d7de' }}>
                        {issue.status === 'resolved' ? '✅ แก้ไขแล้ว' : issue.status === 'inProgress' ? '🔄 กำลังดำเนินการ' : '⏳ รอดำเนินการ'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* Actions */}
            <section className="mb-6">
              <h2 className="text-[14px] font-bold mb-3 uppercase tracking-wide border-b pb-1" style={{ borderColor: '#d0d7de' }}>
                2. มาตรการแก้ไข (Actions)
              </h2>
              <div className="flex flex-col gap-2">
                {actions.slice(0, 6).map((a, i) => {
                  const issue = issues.find(iss => iss.issueId === a.issueId)
                  return (
                    <div key={a.actionId} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: '#f6f8fa' }}>
                      <span className="font-mono text-[11px] font-bold mt-0.5" style={{ color: '#5a6374' }}>{String(i + 1).padStart(2, '0')}</span>
                      <div className="flex-1">
                        <p className="text-[12px] font-semibold">{a.description}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: '#5a6374' }}>
                          ผู้รับผิดชอบ: {a.responsiblePerson} · กำหนดเสร็จ: {fmtDate(a.dueDate)}
                          {issue && ` · เพื่อแก้ไข: ${issue.title}`}
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: a.status === 'done' ? '#e8f5e9' : '#fff8e1', color: a.status === 'done' ? '#2e7d32' : '#f57f17' }}>
                        {a.status === 'done' ? 'เสร็จสิ้น' : 'กำลังดำเนินการ'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Impact */}
            {impacts.length > 0 && (
              <section className="mb-6">
                <h2 className="text-[14px] font-bold mb-3 uppercase tracking-wide border-b pb-1" style={{ borderColor: '#d0d7de' }}>
                  3. ผลการพัฒนา (Evidence of Impact)
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {impacts.map(im => {
                    const issue = issues.find(i => i.issueId === im.issueId)
                    const delta = im.afterScore - im.beforeScore
                    const bBatch = batches.find(b => b.batchId === im.beforeBatchId)
                    const aBatch = batches.find(b => b.batchId === im.afterBatchId)
                    return (
                      <div key={im.impactId} className="p-4 rounded-xl" style={{ border: '1px solid #d0d7de' }}>
                        <p className="text-[12px] font-bold mb-2">{issue?.title ?? im.issueId}</p>
                        <div className="flex items-center gap-2">
                          <div className="text-center">
                            <p className="text-[10px]" style={{ color: '#5a6374' }}>{bBatch?.batchName}</p>
                            <p className="text-[20px] font-bold" style={{ color: '#5a6374' }}>{im.beforeScore}%</p>
                          </div>
                          <span className="text-[16px]">→</span>
                          <div className="text-center">
                            <p className="text-[10px]" style={{ color: '#5a6374' }}>{aBatch?.batchName}</p>
                            <p className="text-[20px] font-bold" style={{ color: '#2e7d32' }}>{im.afterScore}%</p>
                          </div>
                          <div className="ml-auto px-2 py-1 rounded-full text-[12px] font-bold"
                            style={{ background: '#e8f5e9', color: '#2e7d32' }}>+{delta} pts</div>
                        </div>
                        <p className="text-[10px] mt-2" style={{ color: '#5a6374' }}>{im.improvementSummary}</p>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Footer */}
            <footer className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid #d0d7de' }}>
              <p className="text-[11px]" style={{ color: '#5a6374' }}>
                ออกโดย: Signal AAR System · โรงเรียนทหารสื่อสาร
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

function CrestMark({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="crest-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5B2A86" />
          <stop offset="100%" stopColor="#2E1247" />
        </linearGradient>
      </defs>
      <path d="M32 4 L56 12 L56 30 C56 46 44 56 32 60 C20 56 8 46 8 30 L8 12 Z"
        fill="url(#crest-bg)" stroke="#FFD60A" strokeWidth="2" />
      <path d="M20 26 Q32 18 44 26" fill="none" stroke="#FF9500" strokeWidth="1.6" />
      <path d="M16 30 Q32 16 48 30" fill="none" stroke="#FF9500" strokeWidth="1.4" opacity="0.7" />
      <path d="M28 24 L24 36 L30 36 L26 48 L36 32 L30 32 L34 24 Z" fill="#FFD60A" />
      <circle cx="32" cy="32" r="2.5" fill="#fff" />
      <rect x="10" y="50" width="44" height="9" rx="2" fill="#C0383A" stroke="#FFD60A" strokeWidth="1" />
      <text x="32" y="56.5" textAnchor="middle" fontFamily="monospace" fontSize="5.5" fontWeight="700" fill="#fff" letterSpacing="0.6">SIGNAL · SCHOOL</text>
    </svg>
  )
}
