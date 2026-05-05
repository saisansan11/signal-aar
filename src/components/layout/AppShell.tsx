import { NavLink, Outlet } from 'react-router-dom'
import { T } from '../../tokens'
import { MIcon } from '../ui'
import logo from '../../assets/logo.jpg'

const NAV = [
  { to: '/', icon: 'dashboard', label: 'Dashboard' },
  { to: '/sessions', icon: 'event_note', label: 'Sessions' },
  { to: '/issues', icon: 'bug_report', label: 'Issues' },
  { to: '/timeline', icon: 'timeline', label: 'Timeline' },
  { to: '/evidence', icon: 'description', label: 'Evidence' },
]

const DEPT_TH = 'แผนกวิชาการสื่อสารประเภทวิทยุและการสงครามอิเล็กทรอนิกส์'
const DEPT_EN = 'RADIO & EW DEPT.'

export default function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: T.bg }}>
      <aside
        className="flex flex-col w-16 lg:w-56 shrink-0 border-r"
        style={{ background: T.surface, borderColor: T.border }}
      >
        <div className="flex items-center gap-3 px-3 py-4 border-b" style={{ borderColor: T.border }}>
          <img
            src={logo}
            alt={DEPT_TH}
            className="shrink-0 rounded-full object-cover"
            style={{ width: 36, height: 36 }}
          />
          <div className="hidden lg:block min-w-0">
            <p className="text-[13px] font-bold leading-tight truncate" style={{ color: T.fg1 }}>Signal AAR</p>
            <p className="text-[10px] leading-tight truncate" style={{ color: T.fg3 }}>{DEPT_EN}</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 p-2 flex-1">
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[13px] font-medium
                 ${isActive ? 'bg-primary/10' : 'hover:bg-white/5'}`
              }
              style={({ isActive }) => ({ color: isActive ? T.primary : T.fg2 })}
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

        <div className="px-4 py-3 border-t text-[10px] hidden lg:block" style={{ borderColor: T.border, color: T.fg3 }}>
          <div className="font-bold tracking-widest uppercase">{DEPT_EN}</div>
          <div className="truncate">{DEPT_TH}</div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
