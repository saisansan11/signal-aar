import { NavLink, Outlet } from 'react-router-dom'
import { T } from '../../tokens'
import { MIcon } from '../ui'

const NAV = [
  { to: '/', icon: 'dashboard', label: 'Dashboard' },
  { to: '/sessions', icon: 'event_note', label: 'Sessions' },
  { to: '/issues', icon: 'bug_report', label: 'Issues' },
  { to: '/timeline', icon: 'timeline', label: 'Timeline' },
  { to: '/evidence', icon: 'description', label: 'Evidence' },
]

export default function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: T.bg }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col w-16 lg:w-56 shrink-0 border-r"
        style={{ background: T.surface, borderColor: T.border }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: T.border }}>
          <AppMark size={32} />
          <span className="hidden lg:block text-[13px] font-bold leading-tight" style={{ color: T.fg1 }}>
            Signal AAR<br />
            <span className="font-normal text-[11px]" style={{ color: T.fg3 }}>Live & Improvement</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 p-2 flex-1">
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[13px] font-medium group
                 ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-white/5 text-fg2 hover:text-fg1'}`
              }
              style={({ isActive }) => ({ color: isActive ? T.primary : undefined })}
            >
              {({ isActive }) => (
                <>
                  <MIcon name={n.icon} size={20} color={isActive ? T.primary : T.fg2} fill={isActive ? 1 : 0} />
                  <span className="hidden lg:block">{n.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t text-[10px] hidden lg:block" style={{ borderColor: T.border, color: T.fg3 }}>
          <div className="font-bold tracking-widest uppercase">รร.ส.สส.</div>
          <div>Signal School · EW Dept</div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

function AppMark({ size = 32 }: { size?: number }) {
  const r = Math.round(size * 0.25)
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ borderRadius: r, flexShrink: 0 }}>
      <defs>
        <linearGradient id="am-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFAD33" />
          <stop offset="100%" stopColor="#E68600" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx={r * 2} fill="url(#am-bg)" />
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
