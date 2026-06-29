/** "3 min ago", "2 hrs ago", "5 days ago" — compact relative time. */
export function relativeTime(date: Date | string | null | undefined): string {
  if (!date) return "Never"
  const d = typeof date === "string" ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  if (diff < 0) return "in the future"
  const sec = Math.round(diff / 1000)
  if (sec < 60) return "just now"
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} min ago`
  const hrs = Math.round(min / 60)
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`
  const months = Math.round(days / 30)
  if (months < 12) return `${months} mo ago`
  return `${Math.round(months / 12)} yr ago`
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

/** Human label for a schedule interval in minutes. */
export function intervalLabel(minutes: number): string {
  if (minutes % 1440 === 0) {
    const d = minutes / 1440
    return d === 1 ? "Daily" : `Every ${d} days`
  }
  if (minutes % 60 === 0) {
    const h = minutes / 60
    return h === 1 ? "Hourly" : `Every ${h} hours`
  }
  return `Every ${minutes} min`
}
