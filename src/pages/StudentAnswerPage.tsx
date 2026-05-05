import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { T } from '../tokens'
import { LivePulse, MIcon } from '../components/ui'
import { getSessionByCode, subscribeToSession } from '../services/liveSessionService'
import { subscribeToQuestions } from '../services/questionService'
import { submitResponse, getResponsesByQuestion } from '../services/responseService'
import type { LiveSession, Question } from '../models'

export default function StudentAnswerPage() {
  const { code } = useParams<{ code: string }>()
  const alias = sessionStorage.getItem('studentAlias') ?? `นยส.${Math.floor(Math.random() * 900 + 100)}`
  const [session, setSession] = useState<LiveSession | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [submitted, setSubmitted] = useState<Set<string>>(new Set())
  const [ratingPick, setRatingPick] = useState(0)
  const [choicePick, setChoicePick] = useState('')
  const [openText, setOpenText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!code) return
    getSessionByCode(code).then(s => {
      if (s) {
        setSession(s)
        subscribeToSession(s.sessionId, setSession)
        subscribeToQuestions(s.sessionId, setQuestions)
        // Check already submitted questions
        getResponsesByQuestion(s.sessionId, '').then(() => {})
      }
    })
  }, [code])

  const activeQ = questions.find(q => q.questionId === session?.currentQuestionId)
  const alreadySubmitted = activeQ ? submitted.has(activeQ.questionId) : false

  // Reset picks when question changes
  useEffect(() => {
    setRatingPick(0)
    setChoicePick('')
    setOpenText('')
  }, [activeQ?.questionId])

  async function handleSubmit() {
    if (!session || !activeQ || alreadySubmitted) return
    setSubmitting(true)
    try {
      await submitResponse({
        sessionId: session.sessionId,
        questionId: activeQ.questionId,
        batchId: session.batchId,
        studentAlias: alias,
        answerText: activeQ.type === 'openText' ? openText : '',
        selectedOption: (activeQ.type === 'multipleChoice' || activeQ.type === 'yesNo') ? choicePick : '',
        ratingValue: activeQ.type === 'rating' ? ratingPick : null,
      })
      setSubmitted(s => new Set([...s, activeQ.questionId]))
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = !alreadySubmitted && !submitting && (
    (activeQ?.type === 'rating' && ratingPick > 0) ||
    ((activeQ?.type === 'multipleChoice' || activeQ?.type === 'yesNo') && choicePick !== '') ||
    (activeQ?.type === 'openText' && openText.trim().length > 0)
  )

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg }}>
        <p style={{ color: T.fg3 }}>กำลังโหลด...</p>
      </div>
    )
  }

  if (session.status === 'closed') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ background: T.bg }}>
        <MIcon name="check_circle" size={64} color={T.success} fill={1} />
        <h2 className="text-[20px] font-bold" style={{ color: T.fg1 }}>Session สิ้นสุดแล้ว</h2>
        <p className="text-[13px]" style={{ color: T.fg3 }}>ขอบคุณสำหรับการมีส่วนร่วม</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: T.border, background: T.surface }}>
        <div>
          <p className="text-[10px] font-mono" style={{ color: T.fg3 }}>{code}</p>
          <p className="text-[13px] font-semibold" style={{ color: T.fg1 }}>{session.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <LivePulse />
          <span className="text-[11px]" style={{ color: T.fg3 }}>{alias}</span>
        </div>
      </header>

      {/* Progress dots */}
      <div className="flex gap-1.5 px-4 py-3">
        {questions.map(q => (
          <div
            key={q.questionId}
            className="flex-1 h-1.5 rounded-full"
            style={{
              background: submitted.has(q.questionId)
                ? T.success
                : q.questionId === session.currentQuestionId
                ? T.primary
                : T.surfaceLight,
              boxShadow: q.questionId === session.currentQuestionId ? `0 0 8px ${T.primary}` : 'none',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-4">
        {!activeQ ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <MIcon name="hourglass_empty" size={48} color={T.fg3} />
            <p className="text-[14px] font-semibold" style={{ color: T.fg2 }}>รอครูเปิดคำถาม...</p>
          </div>
        ) : alreadySubmitted ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: T.success + '20' }}
            >
              <MIcon name="check_circle" size={48} color={T.success} fill={1} />
            </div>
            <h2 className="text-[18px] font-bold" style={{ color: T.fg1 }}>ส่งคำตอบแล้ว</h2>
            <p className="text-[13px]" style={{ color: T.fg3 }}>รอคำถามถัดไปจากครู</p>
          </div>
        ) : (
          <>
            {/* Question */}
            <div className="mb-6 p-4 rounded-2xl" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <p className="text-[11px] font-mono mb-2" style={{ color: T.primary }}>
                Q{questions.findIndex(q => q.questionId === activeQ.questionId) + 1} · {activeQ.type}
              </p>
              <p className="text-[16px] font-semibold leading-snug" style={{ color: T.fg1 }}>{activeQ.text}</p>
            </div>

            {/* Multiple choice / Yes-No */}
            {(activeQ.type === 'multipleChoice' || activeQ.type === 'yesNo') && (
              <div className="flex flex-col gap-3">
                {activeQ.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setChoicePick(opt)}
                    className="w-full py-3 px-4 rounded-2xl text-left text-[14px] font-semibold transition-all"
                    style={{
                      background: choicePick === opt ? T.primary + '20' : T.surface,
                      border: `2px solid ${choicePick === opt ? T.primary : T.border}`,
                      color: choicePick === opt ? T.primary : T.fg1,
                    }}
                  >
                    <span className="font-mono mr-3" style={{ color: T.fg3 }}>{String.fromCharCode(65 + i)}</span>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Rating */}
            {activeQ.type === 'rating' && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="flex gap-4">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setRatingPick(n)}
                      className="text-[40px] transition-all hover:scale-110"
                      style={{ color: n <= ratingPick ? T.primary : T.fg3 }}
                    >
                      ★
                    </button>
                  ))}
                </div>
                {ratingPick > 0 && (
                  <p className="text-[14px] font-semibold" style={{ color: T.primary }}>
                    {['', 'ควรปรับปรุง', 'พอใช้', 'ดี', 'ดีมาก', 'ดีเยี่ยม'][ratingPick]}
                  </p>
                )}
              </div>
            )}

            {/* Open text */}
            {activeQ.type === 'openText' && (
              <textarea
                value={openText}
                onChange={e => setOpenText(e.target.value)}
                placeholder="พิมพ์ความคิดเห็น / ข้อเสนอแนะ..."
                rows={5}
                className="w-full px-4 py-3 rounded-2xl text-[14px] outline-none resize-none"
                style={{
                  background: T.surface,
                  border: `1px solid ${openText.trim() ? T.primary + '60' : T.border}`,
                  color: T.fg1,
                }}
              />
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="mt-6 py-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all disabled:opacity-30"
              style={{ background: T.primary, color: '#0D1117' }}
            >
              {submitting
                ? <span className="animate-spin material-symbols-rounded">progress_activity</span>
                : <span className="material-symbols-rounded icon-filled">send</span>}
              {submitting ? 'กำลังส่ง...' : 'ส่งคำตอบ'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
