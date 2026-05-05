export function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function fmtTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

export function fmtDateTime(iso: string): string {
  return `${fmtDate(iso)} ${fmtTime(iso)}`
}

export function nowIso(): string {
  return new Date().toISOString()
}
