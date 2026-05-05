import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { T } from '../tokens'
import { Card, Stencil, MIcon, HUDGrid, PrimaryBtn, GhostBtn } from '../components/ui'
import { getCourses } from '../services/courseService'
import { getBatchesByCourse } from '../services/batchService'
import { createSession } from '../services/liveSessionService'
import { addQuestion } from '../services/questionService'
import type { Course, Batch, QuestionType } from '../models'

interface DraftQuestion {
  text: string
  type: QuestionType
  options: string[]
}

const TYPE_LABELS: Record<QuestionType, string> = {
  multipleChoice: 'Multiple Choice',
  yesNo: 'Yes / No',
  rating: 'Rating 1–5',
  openText: 'Open Text',
}

const TYPE_ICONS: Record<QuestionType, string> = {
  multipleChoice: 'format_list_bulleted',
  yesNo: 'thumbs_up_down',
  rating: 'star',
  openText: 'chat_bubble',
}

export default function CreateSessionPage() {
  const nav = useNavigate()
  const [courses, setCourses] = useState<Course[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [courseId, setCourseId] = useState('')
  const [batchId, setBatchId] = useState('')
  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState<DraftQuestion[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { getCourses().then(setCourses) }, [])
  useEffect(() => {
    if (courseId) getBatchesByCourse(courseId).then(setBatches)
  }, [courseId])

  function addQ(type: QuestionType) {
    const defaults: Record<QuestionType, DraftQuestion> = {
      multipleChoice: { text: '', type: 'multipleChoice', options: ['ตัวเลือก A', 'ตัวเลือก B', 'ตัวเลือก C', 'ตัวเลือก D'] },
      yesNo: { text: '', type: 'yesNo', options: ['ใช่', 'ไม่ใช่'] },
      rating: { text: '', type: 'rating', options: [] },
      openText: { text: '', type: 'openText', options: [] },
    }
    setQuestions(qs => [...qs, defaults[type]])
  }

  function removeQ(idx: number) { setQuestions(qs => qs.filter((_, i) => i !== idx)) }

  function updateQ(idx: number, patch: Partial<DraftQuestion>) {
    setQuestions(qs => qs.map((q, i) => i === idx ? { ...q, ...patch } : q))
  }

  function updateOption(qIdx: number, oIdx: number, val: string) {
    setQuestions(qs => qs.map((q, i) => {
      if (i !== qIdx) return q
      const opts = [...q.options]
      opts[oIdx] = val
      return { ...q, options: opts }
    }))
  }

  async function handleSave(startNow: boolean) {
    if (!courseId || !batchId || !title.trim()) return
    setSaving(true)
    try {
      const session = await createSession({ courseId, batchId, title, createdBy: 'instructor' })
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        await addQuestion({ sessionId: session.sessionId, text: q.text, type: q.type, options: q.options, order: i + 1, isActive: false })
      }
      if (startNow) {
        const { updateSessionStatus } = await import('../services/liveSessionService')
        await updateSessionStatus(session.sessionId, 'active')
      }
      nav(`/sessions/${session.sessionId}/dashboard`)
    } finally {
      setSaving(false)
    }
  }

  const valid = courseId && batchId && title.trim()

  return (
    <div className="relative min-h-screen p-6" style={{ background: T.bg }}>
      <HUDGrid />
      <div className="relative max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => nav(-1)} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <MIcon name="arrow_back" size={20} color={T.fg2} />
          </button>
          <div>
            <Stencil color={T.primary}>สร้าง Session ใหม่</Stencil>
            <h1 className="mt-0.5 text-[20px] font-bold" style={{ color: T.fg1 }}>Create Live AAR Session</h1>
          </div>
        </div>

        {/* Session info */}
        <Card className="mb-6">
          <Stencil color={T.primary} className="mb-4">ข้อมูล Session</Stencil>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-semibold" style={{ color: T.fg2 }}>หลักสูตร *</span>
              <select
                value={courseId}
                onChange={e => { setCourseId(e.target.value); setBatchId('') }}
                className="px-3 py-2 rounded-xl text-[13px] outline-none"
                style={{ background: T.surfaceLight, border: `1px solid ${T.border}`, color: courseId ? T.fg1 : T.fg3 }}
              >
                <option value="">เลือกหลักสูตร</option>
                {courses.map(c => <option key={c.courseId} value={c.courseId}>{c.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-semibold" style={{ color: T.fg2 }}>รุ่นที่ *</span>
              <select
                value={batchId}
                onChange={e => setBatchId(e.target.value)}
                disabled={!courseId}
                className="px-3 py-2 rounded-xl text-[13px] outline-none disabled:opacity-40"
                style={{ background: T.surfaceLight, border: `1px solid ${T.border}`, color: batchId ? T.fg1 : T.fg3 }}
              >
                <option value="">เลือกรุ่น</option>
                {batches.map(b => <option key={b.batchId} value={b.batchId}>{b.batchName}</option>)}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold" style={{ color: T.fg2 }}>ชื่อ Session *</span>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="เช่น AAR — ECM Burn-through สัปดาห์ที่ 2"
              className="px-3 py-2 rounded-xl text-[13px] outline-none"
              style={{ background: T.surfaceLight, border: `1px solid ${T.border}`, color: T.fg1 }}
            />
          </label>
        </Card>

        {/* Questions */}
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Stencil color={T.accentBlue}>คำถาม ({questions.length})</Stencil>
          </div>

          {questions.length === 0 && (
            <p className="text-[13px] py-4 text-center" style={{ color: T.fg3 }}>ยังไม่มีคำถาม — เพิ่มด้านล่าง</p>
          )}

          <div className="flex flex-col gap-3 mb-4">
            {questions.map((q, idx) => (
              <div key={idx} className="p-4 rounded-xl" style={{ background: T.surfaceLight, border: `1px solid ${T.border}` }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded-md" style={{ background: T.border, color: T.fg3 }}>Q{idx + 1}</span>
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: T.primary }}>
                      <MIcon name={TYPE_ICONS[q.type]} size={13} color={T.primary} fill={1} />
                      {TYPE_LABELS[q.type]}
                    </span>
                  </div>
                  <button onClick={() => removeQ(idx)} className="p-1 rounded-lg hover:bg-error/20 transition-colors">
                    <MIcon name="delete" size={16} color={T.error} />
                  </button>
                </div>
                <input
                  value={q.text}
                  onChange={e => updateQ(idx, { text: e.target.value })}
                  placeholder="พิมพ์คำถาม..."
                  className="w-full px-3 py-2 rounded-lg text-[13px] outline-none mb-2"
                  style={{ background: T.card, border: `1px solid ${T.border}`, color: T.fg1 }}
                />
                {q.type === 'multipleChoice' && (
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, oi) => (
                      <input
                        key={oi}
                        value={opt}
                        onChange={e => updateOption(idx, oi, e.target.value)}
                        className="px-3 py-1.5 rounded-lg text-[12px] outline-none"
                        style={{ background: T.card, border: `1px solid ${T.border}`, color: T.fg1 }}
                        placeholder={`ตัวเลือก ${String.fromCharCode(65 + oi)}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add question buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(Object.keys(TYPE_LABELS) as QuestionType[]).map(type => (
              <button
                key={type}
                onClick={() => addQ(type)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold hover:bg-white/5 transition-colors"
                style={{ border: `1px dashed ${T.border}`, color: T.fg2 }}
              >
                <MIcon name={TYPE_ICONS[type]} size={14} color={T.primary} />
                {TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </Card>

        {/* Action buttons */}
        <div className="flex gap-3 justify-end">
          <GhostBtn onClick={() => nav(-1)}>ยกเลิก</GhostBtn>
          <GhostBtn onClick={() => handleSave(false)} icon="save" disabled={!valid || saving}>
            บันทึก Draft
          </GhostBtn>
          <PrimaryBtn onClick={() => handleSave(true)} icon="play_arrow" disabled={!valid || saving}>
            {saving ? 'กำลังสร้าง...' : 'เริ่ม Session ทันที'}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}
