import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { T } from '../tokens'
import { getSessionByCode } from '../services/liveSessionService'
import { normalizeCode } from '../utils/joinCode'

export default function StudentJoinPage() {
  const nav = useNavigate()
  const [code, setCode] = useState('')
  const [alias, setAlias] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleJoin() {
    const clean = normalizeCode(code)
    if (clean.length < 4) { setError('กรุณาใส่รหัสอย่างน้อย 4 ตัว'); return }
    setLoading(true)
    setError('')
    try {
      const session = await getSessionByCode(clean)
      if (!session) { setError('ไม่พบ Session หรือ Session ถูกปิดแล้ว'); return }
      // Store alias in sessionStorage for StudentAnswerPage
      sessionStorage.setItem('studentAlias', alias.trim() || `นยส.${Math.floor(Math.random() * 900 + 100)}`)
      nav(`/join/${clean}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: T.bg }}
    >
      {/* App icon */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <AppMark size={72} />
        <div className="text-center">
          <p className="text-[11px] font-bold tracking-[3px] uppercase" style={{ color: T.primary }}>Signal School</p>
          <h1 className="text-[22px] font-bold mt-1" style={{ color: T.fg1 }}>เข้าร่วม AAR Session</h1>
          <p className="text-[13px] mt-1" style={{ color: T.fg3 }}>ใส่รหัสที่ได้รับจากครูผู้สอน</p>
        </div>
      </div>

      <div
        className="w-full max-w-sm p-6 rounded-2xl flex flex-col gap-4"
        style={{ background: T.surface, border: `1px solid ${T.border}` }}
      >
        {/* Join code */}
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold" style={{ color: T.fg2 }}>รหัส Session</span>
          <input
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase().slice(0, 8)); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="เช่น ECM14K"
            className="px-4 py-3 rounded-xl text-[20px] font-mono font-bold tracking-[6px] text-center outline-none"
            style={{
              background: T.surfaceLight,
              border: `2px solid ${error ? T.error : code.length >= 4 ? T.success : T.border}`,
              color: T.fg1,
            }}
            maxLength={8}
            autoFocus
            autoComplete="off"
          />
        </label>

        {/* Alias */}
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold" style={{ color: T.fg2 }}>ชื่อ / กลุ่ม (ไม่บังคับ)</span>
          <input
            value={alias}
            onChange={e => setAlias(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="เช่น นยส.สมชาย หรือ กลุ่มที่ 3"
            className="px-4 py-2.5 rounded-xl text-[14px] outline-none"
            style={{ background: T.surfaceLight, border: `1px solid ${T.border}`, color: T.fg1 }}
          />
        </label>

        {error && <p className="text-[12px] text-center" style={{ color: T.error }}>{error}</p>}

        <button
          onClick={handleJoin}
          disabled={loading || code.length < 4}
          className="py-3 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all disabled:opacity-40"
          style={{ background: T.primary, color: '#0D1117' }}
        >
          {loading ? (
            <span className="animate-spin material-symbols-rounded text-[18px]">progress_activity</span>
          ) : (
            <span className="material-symbols-rounded icon-filled text-[18px]">login</span>
          )}
          {loading ? 'กำลังตรวจสอบ...' : 'เข้าร่วม Session'}
        </button>

        <p className="text-center text-[11px]" style={{ color: T.fg3 }}>
          ไม่จำเป็นต้อง Login · ข้อมูลจะไม่ถูกเก็บถาวร
        </p>
      </div>
    </div>
  )
}

function AppMark({ size = 64 }: { size?: number }) {
  const r = Math.round(size * 0.2)
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ borderRadius: r }}>
      <defs>
        <linearGradient id="am2-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFAD33" />
          <stop offset="100%" stopColor="#E68600" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx={r * 2} fill="url(#am2-bg)" />
      <path d="M14 44 A22 22 0 0 1 50 44" fill="none" stroke="#0D1117" strokeWidth="2" opacity="0.35" />
      <path d="M20 44 A16 16 0 0 1 44 44" fill="none" stroke="#0D1117" strokeWidth="2" opacity="0.5" />
      <path d="M26 44 A10 10 0 0 1 38 44" fill="none" stroke="#0D1117" strokeWidth="2" opacity="0.7" />
      <rect x="30" y="44" width="4" height="10" fill="#0D1117" />
      <rect x="22" y="52" width="20" height="4" rx="1" fill="#0D1117" />
      <path d="M32 44 L46 22" stroke="#0D1117" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="46" cy="22" r="2.4" fill="#fff" />
    </svg>
  )
}
