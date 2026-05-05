import type { ReactNode, CSSProperties } from 'react'
import { T } from '../../tokens'

// ── Stencil label ──────────────────────────────────────────────────
export function Stencil({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={`font-sans text-[11px] font-bold tracking-[3px] uppercase ${className ?? ''}`}
      style={{ color: color ?? T.fg3 }}
    >
      {children}
    </span>
  )
}

// ── Card ───────────────────────────────────────────────────────────
export function Card({
  children, padding = 20, accent, glow, style, onClick, className,
}: {
  children: ReactNode; padding?: number; accent?: string; glow?: string
  style?: CSSProperties; onClick?: () => void; className?: string
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl ${onClick ? 'cursor-pointer' : ''} ${className ?? ''}`}
      style={{
        background: T.card,
        border: `1px solid ${accent ?? T.border}`,
        padding,
        boxShadow: glow ? `0 4px 20px ${glow}40` : '0 2px 10px rgba(0,0,0,.3)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ── Chip / pill ────────────────────────────────────────────────────
export function Chip({
  children, color, icon, solid, size = 11,
}: {
  children: ReactNode; color?: string; icon?: string; solid?: boolean; size?: number
}) {
  const c = color ?? T.fg2
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full whitespace-nowrap font-semibold"
      style={{
        padding: size > 11 ? '6px 12px' : '4px 10px',
        background: solid ? c : c + '1F',
        color: solid ? '#0D1117' : c,
        fontSize: size,
        border: solid ? 'none' : `1px solid ${c}66`,
        letterSpacing: 0.3,
      }}
    >
      {icon && <span className="material-symbols-rounded icon-filled" style={{ fontSize: size + 4 }}>{icon}</span>}
      {children}
    </span>
  )
}

// ── Status dot ─────────────────────────────────────────────────────
export function StatusDot({ tone = 'success', size = 8 }: { tone?: 'success' | 'warning' | 'error' | 'info' | 'primary'; size?: number }) {
  const map = { success: T.success, warning: T.warning, error: T.error, info: T.info, primary: T.primary }
  const c = map[tone]
  return (
    <span
      className="inline-block rounded-full"
      style={{ width: size, height: size, background: c, boxShadow: `0 0 ${size + 4}px ${c}AA` }}
    />
  )
}

// ── Live pulse badge ───────────────────────────────────────────────
export function LivePulse() {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full font-bold tracking-widest uppercase"
      style={{
        padding: '5px 11px', fontSize: 11,
        background: T.error + '1A', border: `1px solid ${T.error}66`, color: T.error,
      }}
    >
      <span
        className="animate-live-pulse rounded-full"
        style={{ width: 8, height: 8, background: T.error, boxShadow: `0 0 10px ${T.error}` }}
      />
      LIVE
    </span>
  )
}

// ── Material icon ──────────────────────────────────────────────────
export function MIcon({
  name, size = 20, color, fill = 0, className,
}: {
  name: string; size?: number; color?: string; fill?: 0 | 1; className?: string
}) {
  return (
    <span
      className={`material-symbols-rounded ${className ?? ''}`}
      style={{
        fontSize: size,
        color: color ?? T.fg1,
        fontVariationSettings: `'FILL' ${fill}, 'wght' 500, 'GRAD' 0, 'opsz' 24`,
      }}
    >
      {name}
    </span>
  )
}

// ── HUD background grid ────────────────────────────────────────────
export function HUDGrid({ opacity = 0.04 }: { opacity?: number }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none hud-grid"
      style={{ opacity }}
    />
  )
}

// ── Section header ─────────────────────────────────────────────────
export function SectionHeader({
  eyebrow, title, action, color,
}: {
  eyebrow?: string; title: string; action?: ReactNode; color?: string
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        {eyebrow && <Stencil color={color ?? T.primary}>{eyebrow}</Stencil>}
        <div className="mt-1 text-[22px] font-bold tracking-tight" style={{ color: T.fg1 }}>{title}</div>
      </div>
      {action}
    </div>
  )
}

// ── Stat tile ──────────────────────────────────────────────────────
export function StatTile({
  label, value, suffix, delta, color, icon, mono,
}: {
  label: string; value: string | number; suffix?: string; delta?: number; color?: string; icon?: string; mono?: boolean
}) {
  const c = color ?? T.primary
  return (
    <Card padding={16}>
      <div className="flex items-center justify-between">
        <Stencil>{label}</Stencil>
        {icon && <MIcon name={icon} size={16} color={c} fill={1} />}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span
          className="text-[28px] font-bold tracking-tight"
          style={{ fontFamily: mono ? `"JetBrains Mono", monospace` : undefined, color: c }}
        >
          {value}
        </span>
        {suffix && <span className="text-[13px] font-medium" style={{ color: T.fg2 }}>{suffix}</span>}
      </div>
      {delta != null && (
        <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold" style={{ color: delta >= 0 ? T.success : T.error }}>
          <MIcon name={delta >= 0 ? 'trending_up' : 'trending_down'} size={14} color={delta >= 0 ? T.success : T.error} />
          {delta >= 0 ? '+' : ''}{delta}%
          <span className="font-normal" style={{ color: T.fg3 }}>vs last</span>
        </div>
      )}
    </Card>
  )
}

// ── Progress bar ───────────────────────────────────────────────────
export function Bar({
  value, max = 100, color, height = 8, glow,
}: {
  value: number; max?: number; color?: string; height?: number; glow?: boolean
}) {
  const c = color ?? T.primary
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="w-full overflow-hidden rounded-full" style={{ height, background: T.surfaceLight }}>
      <div
        className="h-full transition-all duration-300"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${c}, ${c}DD)`,
          boxShadow: glow ? `0 0 12px ${c}99` : 'none',
        }}
      />
    </div>
  )
}

// ── HUD corner brackets ────────────────────────────────────────────
export function CornerBrackets({ color, size = 14, inset = 0 }: { color?: string; size?: number; inset?: number }) {
  const c = color ?? T.primary
  const base: CSSProperties = { position: 'absolute', width: size, height: size, borderColor: c, borderStyle: 'solid' }
  return (
    <>
      <span style={{ ...base, top: inset, left: inset, borderWidth: '2px 0 0 2px' }} />
      <span style={{ ...base, top: inset, right: inset, borderWidth: '2px 2px 0 0' }} />
      <span style={{ ...base, bottom: inset, left: inset, borderWidth: '0 0 2px 2px' }} />
      <span style={{ ...base, bottom: inset, right: inset, borderWidth: '0 2px 2px 0' }} />
    </>
  )
}

// ── Primary button ─────────────────────────────────────────────────
export function PrimaryBtn({
  children, onClick, disabled, icon, size = 'md', className,
}: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; icon?: string
  size?: 'sm' | 'md' | 'lg'; className?: string
}) {
  const pad = size === 'sm' ? 'px-3 py-1.5 text-[12px]' : size === 'lg' ? 'px-6 py-3 text-[15px]' : 'px-4 py-2 text-[13px]'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-[10px] font-semibold transition-all ${pad} ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90 active:scale-95'} ${className ?? ''}`}
      style={{ background: T.primary, color: '#0D1117' }}
    >
      {icon && <MIcon name={icon} size={size === 'sm' ? 14 : 16} color="#0D1117" />}
      {children}
    </button>
  )
}

// ── Ghost button ───────────────────────────────────────────────────
export function GhostBtn({
  children, onClick, icon, size = 'md', disabled, className,
}: {
  children: ReactNode; onClick?: () => void; icon?: string
  size?: 'sm' | 'md'; disabled?: boolean; className?: string
}) {
  const pad = size === 'sm' ? 'px-3 py-1.5 text-[12px]' : 'px-4 py-2 text-[13px]'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-[10px] font-semibold border transition-all hover:bg-white/5 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${pad} ${className ?? ''}`}
      style={{ borderColor: T.border, color: T.fg1 }}
    >
      {icon && <MIcon name={icon} size={16} color={T.fg1} />}
      {children}
    </button>
  )
}

// ── Empty state ────────────────────────────────────────────────────
export function EmptyState({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <MIcon name={icon} size={48} color={T.fg3} />
      <p className="font-semibold text-[15px]" style={{ color: T.fg2 }}>{title}</p>
      {sub && <p className="text-[13px]" style={{ color: T.fg3 }}>{sub}</p>}
    </div>
  )
}

// ── Badge / severity ───────────────────────────────────────────────
export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = { P1: T.error, P2: T.warning, P3: T.info, P4: T.fg3 }
  const c = map[severity] ?? T.fg3
  return <Chip color={c} size={10}>{severity}</Chip>
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { c: string; label: string }> = {
    open: { c: T.error, label: 'Open' },
    inProgress: { c: T.warning, label: 'In Progress' },
    resolved: { c: T.success, label: 'Resolved' },
    ignored: { c: T.fg3, label: 'Ignored' },
    draft: { c: T.fg3, label: 'Draft' },
    active: { c: T.success, label: 'Active' },
    closed: { c: T.fg2, label: 'Closed' },
    pending: { c: T.fg3, label: 'Pending' },
    done: { c: T.success, label: 'Done' },
    cancelled: { c: T.error, label: 'Cancelled' },
  }
  const m = map[status] ?? { c: T.fg3, label: status }
  return <Chip color={m.c} size={10}>{m.label}</Chip>
}
