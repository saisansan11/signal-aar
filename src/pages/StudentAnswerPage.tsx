import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { T } from '../tokens'
import { LivePulse, MIcon } from '../components/ui'
import { getSessionByCode, subscribeToSession } from '../services/liveSessionService'
import { subscribeToQuestions } from '../services/questionService'
import { submitResponse, makeResponseId } from '../services/responseService'
import type { LiveSession, Question } from '../models'

// Persist alias across page refreshes (same device = same alias)
function getOrCreateAlias(): string {
  const stored = localStorage.getItem('aar:studentAlias')
  if (stored) return stored
  const generated = `นยส.${Math.floor(Math.random() * 900 + 100)}`
  try { localStorage.setItem('aar:studentAlias', generated) } catch { /* quota */ }
  return generated
}

export default function StudentAnswerPage() {
  const { code } = useParams<{ code: string }>()

  // Stable alias — prefer sessionStorage (set by JoinPage), then localStorage, then generate
  const alias = useRef(
    sessionStorage.getItem('studentAlias') ?? getOrCreateAlias()
  ).current

  const [session,     setSession]     = useState<LiveSession | null>(null)
  const [questions,   setQuestions]   = useState<Question[]>([])
  const [submitted,   setSubmitted]   = useState<Set<string>>(new Set())
  const [ratingPick,  setRatingPick]  = useState(0)
  const [choicePick,  setChoicePick]  = useState('')
  const [openText,    setOpenText]    = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [connError,   setConnError]   = useState(false)

  // ── state recovery: restore session from localStorage if URL is revisited ──
  useEffect(() => {
    if (!code) return
    let unsubSession  = () => {}
    let unsubQs       = () => {}
    let cancelled     = false

    // Persist code → recover on refresh
    try { localStorage.setItem('aar:lastCode', code) } catch { /* quota */ }

    getSessionByCode(code).then(s => {
      if (cancelled) return
      if (!s) { setConnError(true); return }
      setSession(s)
      setConnError(false)
      unsubSession = subscribeToSession(s.sessionId, upd => {
        if (!cancelled) setSession(upd)
      }, { onError: () => setConnError(true) })
      unsubQs = subscribeToQuestions(s.sessionId, qs => {
        if (!cancelled) setQuestions(qs)
      }, { onError: () => setConnError(true) })
    }).catch(() => setConnError(true))

    return () => { cancelled = true; unsubSession(); unsubQs() }
  }, [code])

  const activeQ = questions.find(q => q.questionId === session?.currentQuestionId)
  const alreadySubmitted = activeQ ? submitted.has(activeQ.questionId) : false

  // ── check if already submitted this question (deterministic ID lookup) ──
  useEffect(() => {
    if (!session || !activeQ) return
    // With deterministic IDs we can compute client-side whether submitted
    const rid = makeResponseId(session.sessionId, activeQ.questionId, alias)
    // Mark as submitted if we see this ID in the submitted set or from storage
    const key = `aar:submitted:${rid}`
    if (localStorage.getItem(key) === '1') {
      setSubmitted(prev => new Set([...prev, activeQ.questionId]))
    }
  }, [session?.sessionId, activeQ?.questionId, alias])

  // Reset picks when question changes
  useEffect(() => {
    setRatingPick(0)
    setChoicePick('')
    setOpenText('')
    setSubmitError(null)
  }, [activeQ?.questionId])

  async function handleSubmit() {
    if (!session || !activeQ || alreadySubmitted || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const { isDuplicate } = await submitResponse({
        sessionId:      session.sessionId,
        questionId:     activeQ.questionId,
        batchId:        session.batchId,
        studentAlias:   alias,
        answerText:     activeQ.type === 'openText' ? openText.trim() : '',
        selectedOption: (activeQ.type === 'multipleChoice' || activeQ.type === 'yesNo') ? choicePick : '',
        ratingValue:    activeQ.type === 'rating' ? ratingPick : null,
      })
      // Mark locally so we survive refresh without extra Firestore read
      const rid = makeResponseId(session.sessionId, activeQ.questionId, alias)
      try { localStorage.setItem(`aar:submitted:${rid}`, '1') } catch { /* quota */ }
      setSubmitted(s => new Set([...s, activeQ.questionId]))
      if (isDuplicate) {
        setSubmitError('คำตอบของท่านถูกบันทึกแล้ว (ส่งซ้ำ)')
      }
    } catch (err) {
      setSubmitError('ส่งคำตอบไม่สำเร็จ กรุณาลองใหม่')
      console.error('[submitResponse]', err)
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = !alreadySubmitted && !submitting && (
    (activeQ?.type === 'rating'       && ratingPick > 0) ||
    ((activeQ?.type === 'multipleChoice' || activeQ?.type === 'yesNo') && choicePick !== '') ||
    (activeQ?.type === 'openText'     && openText.trim().length > 0)
  )

  // ── Loading ──────────────────────────────────────────────────────
  if (!session && !connError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: T.bg }}>
        <span className="animate-spin material-symbols-rounded text-[36px]"
          style={{ color: T.primary }}>progress_activity</span>
        <p className="text-[13px]" style={{ color: T.fg3 }}>กำลังเชื่อมต่อ Session…</p>
      </div>
    )
  }

  // ── Connection error ─────────────────────────────────────────────
  if (connError || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center"
        style={{ background: T.bg }}>
        <MIcon name="wifi_off" size={56} color={T.error} />
        <h2 className="text-[18px] font-bold" style={{ color: T.fg1 }}>ไม่พบ Session</h2>
        <p className="text-[13px]" style={{ color: T.fg3 }}>
          รหัส "{code}" ไม่ถูกต้อง หรือ Session ถูกปิดแล้ว
        </p>
        <button type="button" onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl text-[13px] font-semibold"
          style={{ background: T.primary, color: '#0D1117' }}>
          ลองใหม่
        </button>
      </div>
    )
  }

  // ── Session closed ───────────────────────────────────────────────
  if (session.status === 'closed') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4"
        style={{ background: T.bg }}>
        <div className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: T.success + '20' }}>
          <MIcon name="check_circle" size={56} color={T.success} fill={1} />
        </div>
        <h2 className="text-[20px] font-bold" style={{ color: T.fg1 }}>Session สิ้นสุดแล้ว</h2>
        <p className="text-[13px]" style={{ color: T.fg3 }}>ขอบคุณสำหรับการมีส่วนร่วม · {alias}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between border-b"
        style={{ borderColor: T.border, background: T.surface }}>
        <div>
          <p className="text-[10px] font-mono" style={{ color: T.fg3 }}>{code}</p>
          <p className="text-[13px] font-semibold" style={{ color: T.fg1 }}>{session.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <LivePulse />
          <span className="text-[11px]" style={{ color: T.fg3 }}>{alias}</span>
        </div>
      </header>

      {/* Question progress bar */}
      <div className="flex gap-1.5 px-4 py-3">
        {questions.map(q => (
          <div key={q.questionId} className="flex-1 h-1.5 rounded-full transition-all duration-500"
            style={{
              background: submitted.has(q.questionId) ? T.success
                : q.questionId === session.currentQuestionId ? T.primary
                : T.surfaceLight,
              boxShadow: q.questionId === session.currentQuestionId ? `0 0 8px ${T.primary}` : 'none',
            }} />
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col p-4">
        {!activeQ ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <MIcon name="hourglass_empty" size={48} color={T.fg3} />
            <p className="text-[14px] font-semibold" style={{ color: T.fg2 }}>รอครูเปิดคำถาม…</p>
          </div>

        ) : alreadySubmitted ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: T.success + '20' }}>
              <MIcon name="check_circle" size={48} color={T.success} fill={1} />
            </div>
            <h2 className="text-[18px] font-bold" style={{ color: T.fg1 }}>ส่งคำตอบแล้ว</h2>
            <p className="text-[13px]" style={{ color: T.fg3 }}>รอคำถามถัดไปจากครู</p>
            {submitError && (
              <p className="text-[12px] px-3 py-2 rounded-xl"
                style={{ color: T.warning, background: T.warning + '18' }}>{submitError}</p>
            )}
          </div>

        ) : (
          <>
            {/* Question card */}
            <div className="mb-5 p-4 rounded-2xl" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
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
                    type="button"
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
                <div className="flex gap-3">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      aria-label={`${n} ดาว`}
                      onClick={() => setRatingPick(n)}
                      className="text-[44px] transition-all hover:scale-110 active:scale-95"
                      style={{
                        color: n <= ratingPick ? T.primary : T.fg3,
                        filter: n <= ratingPick ? `drop-shadow(0 0 6px ${T.primary}80)` : 'none',
                      }}
                    >★</button>
                  ))}
                </div>
                {ratingPick > 0 && (
                  <p className="text-[15px] font-semibold" style={{ color: T.primary }}>
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

            {/* Error */}
            {submitError && (
              <p className="mt-3 text-[12px] text-center px-3 py-2 rounded-xl"
                style={{ color: T.error, background: T.error + '18' }}>{submitError}</p>
            )}

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="mt-5 py-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all disabled:opacity-30 active:scale-95"
              style={{ background: T.primary, color: '#0D1117' }}
            >
              {submitting
                ? <span className="animate-spin material-symbols-rounded">progress_activity</span>
                : <span className="material-symbols-rounded icon-filled">send</span>}
              {submitting ? 'กำลังส่ง…' : 'ส่งคำตอบ'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
