import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { T } from '../tokens'
import { getSessionByCode } from '../services/liveSessionService'
import { normalizeCode } from '../utils/joinCode'
import logo from '../assets/logo.jpg'

const ALIAS_KEY = 'signal-aar:student-alias'
const DEPT_TH = 'แผนกวิชาการสื่อสารประเภทวิทยุและการสงครามอิเล็กทรอนิกส์'
const DEPT_EN = 'RADIO & EW DEPT.'

export default function StudentJoinPage() {
  const nav = useNavigate()
  const [code, setCode] = useState('')
  const [alias, setAlias] = useState(() => {
    try {
      return localStorage.getItem(ALIAS_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try {
      if (alias.trim()) localStorage.setItem(ALIAS_KEY, alias.trim())
      else localStorage.removeItem(ALIAS_KEY)
    } catch {
      // Ignore storage failures in locked-down browsers.
    }
  }, [alias])

  async function handleJoin() {
    const clean = normalizeCode(code)
    if (clean.length < 4) {
      setError('กรุณาใส่รหัสอย่างน้อย 4 ตัว')
      return
    }

    setLoading(true)
    setError('')

    try {
      const session = await getSessionByCode(clean)
      if (!session) {
        setError('ไม่พบ Session หรือ Session ถูกปิดแล้ว')
        return
      }

      sessionStorage.setItem('studentAlias', alias.trim() || `นยส.${Math.floor(Math.random() * 900 + 100)}`)
      nav(`/join/${clean}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden"
      style={{ background: T.bg }}
    >
      <div
        className="absolute -top-24 -left-16 w-72 h-72 rounded-full blur-3xl opacity-20"
        style={{ background: T.primary }}
      />
      <div
        className="absolute -bottom-20 -right-16 w-80 h-80 rounded-full blur-3xl opacity-10"
        style={{ background: T.accentBlue }}
      />

      <div className="relative z-10 mb-8 flex flex-col items-center gap-3">
        <img src={logo} alt={DEPT_TH} className="rounded-full object-cover" style={{ width: 80, height: 80 }} />
        <div className="text-center">
          <p className="text-[11px] font-bold tracking-[3px] uppercase" style={{ color: T.primary }}>{DEPT_EN}</p>
          <h1 className="text-[22px] font-bold mt-1" style={{ color: T.fg1 }}>เข้าร่วม AAR Session</h1>
          <p className="text-[13px] mt-1 max-w-sm" style={{ color: T.fg3 }}>
            {DEPT_TH}
          </p>
          <p className="text-[13px] mt-2 max-w-sm" style={{ color: T.fg3 }}>
            ใส่รหัสที่ได้รับจากครูผู้สอน แล้วส่งความคิดเห็นได้ทันทีโดยไม่ต้องล็อกอิน
          </p>
        </div>
      </div>

      <div
        className="relative z-10 w-full max-w-sm p-6 rounded-3xl flex flex-col gap-4"
        style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 24px 64px rgba(0,0,0,.28)' }}
      >
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold" style={{ background: T.primary + '18', color: T.primary }}>
            LIVE FEEDBACK
          </span>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold" style={{ background: T.accentBlue + '18', color: T.accentBlue }}>
            NO LOGIN
          </span>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold" style={{ background: T.success + '18', color: T.success }}>
            MOBILE READY
          </span>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold" style={{ color: T.fg2 }}>รหัส Session</span>
          <input
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase().slice(0, 8)); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="เช่น DEMO01"
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

        {alias.trim() && (
          <p className="text-[11px]" style={{ color: T.fg3 }}>
            ระบบจะจำชื่ออัตโนมัติบนอุปกรณ์นี้เพื่อให้เข้าร่วมครั้งถัดไปได้เร็วขึ้น
          </p>
        )}

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

        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: '1', text: 'ใส่รหัส' },
            { label: '2', text: 'ยืนยันชื่อ' },
            { label: '3', text: 'ตอบสด' },
          ].map(step => (
            <div key={step.label} className="p-2 rounded-xl" style={{ background: T.surfaceLight }}>
              <p className="text-[15px] font-bold" style={{ color: T.primary }}>{step.label}</p>
              <p className="text-[10px]" style={{ color: T.fg3 }}>{step.text}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-[11px]" style={{ color: T.fg3 }}>
          ไม่จำเป็นต้อง Login · ข้อมูลระบุตัวตนไม่ถูกเก็บถาวรในฝั่งผู้เรียน
        </p>
      </div>
    </div>
  )
}
