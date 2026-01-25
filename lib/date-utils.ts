import { formatDistanceToNow, format, isToday, isYesterday, isTomorrow } from 'date-fns'

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date

  if (isToday(d)) {
    return `Today, ${format(d, 'h:mm a')}`
  }

  if (isYesterday(d)) {
    return `Yesterday, ${format(d, 'h:mm a')}`
  }

  if (isTomorrow(d)) {
    return `Tomorrow, ${format(d, 'h:mm a')}`
  }

  return formatDistanceToNow(d, { addSuffix: true })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'MMM d, yyyy • h:mm a')
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'MMMM d, yyyy')
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'h:mm a')
}
