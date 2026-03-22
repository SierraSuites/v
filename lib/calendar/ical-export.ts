/**
 * iCal Export Utilities
 * Generate .ics files for calendar integration
 */

interface CalendarEvent {
  id: string
  title: string
  description?: string
  start_date: string
  due_date: string
  location?: string
  status?: string
}

/**
 * Format date for iCal (YYYYMMDDTHHMMSSZ)
 */
function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

/**
 * Escape special characters in iCal text fields
 */
function escapeICalText(text: string): string {
  return text.replace(/[\\,;]/g, (match) => '\\' + match).replace(/\n/g, '\\n')
}

/**
 * Generate a single iCal event
 */
export function generateICalEvent(event: CalendarEvent): string {
  const startDate = new Date(event.start_date)
  const endDate = new Date(event.due_date)
  const now = new Date()

  const lines = [
    'BEGIN:VEVENT',
    `UID:${event.id}@construction-platform`,
    `DTSTAMP:${formatICalDate(now)}`,
    `DTSTART:${formatICalDate(startDate)}`,
    `DTEND:${formatICalDate(endDate)}`,
    `SUMMARY:${escapeICalText(event.title)}`,
  ]

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICalText(event.description)}`)
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICalText(event.location)}`)
  }

  if (event.status) {
    // Map task status to iCal status
    const icalStatus =
      event.status === 'completed'
        ? 'COMPLETED'
        : event.status === 'in_progress'
        ? 'IN-PROCESS'
        : 'NEEDS-ACTION'
    lines.push(`STATUS:${icalStatus}`)
  }

  lines.push('END:VEVENT')

  return lines.join('\r\n')
}

/**
 * Generate complete iCal file with multiple events
 */
export function generateICalFile(
  events: CalendarEvent[],
  calendarName: string = 'Construction Project Schedule'
): string {
  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Construction Platform//Schedule Export//EN',
    `X-WR-CALNAME:${escapeICalText(calendarName)}`,
    'X-WR-TIMEZONE:UTC',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ].join('\r\n')

  const eventStrings = events.map(generateICalEvent)

  const footer = 'END:VCALENDAR'

  return [header, ...eventStrings, footer].join('\r\n')
}

/**
 * Generate download link for iCal file
 */
export function downloadICalFile(content: string, filename: string = 'schedule.ics'): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * Generate Google Calendar URL for a single event
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const startDate = new Date(event.start_date)
  const endDate = new Date(event.due_date)

  // Google Calendar uses format: YYYYMMDDTHHmmSSZ
  const formatGoogleDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
  })

  if (event.description) {
    params.set('details', event.description)
  }

  if (event.location) {
    params.set('location', event.location)
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Generate Outlook.com calendar URL for a single event
 */
export function generateOutlookCalendarUrl(event: CalendarEvent): string {
  const startDate = new Date(event.start_date)
  const endDate = new Date(event.due_date)

  // Outlook uses ISO 8601 format
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: startDate.toISOString(),
    enddt: endDate.toISOString(),
  })

  if (event.description) {
    params.set('body', event.description)
  }

  if (event.location) {
    params.set('location', event.location)
  }

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

/**
 * Get calendar integration options
 */
export function getCalendarIntegrationOptions(event: CalendarEvent) {
  return {
    google: generateGoogleCalendarUrl(event),
    outlook: generateOutlookCalendarUrl(event),
    downloadIcal: () => {
      const icalContent = generateICalFile([event], event.title)
      downloadICalFile(icalContent, `${event.title.replace(/[^a-z0-9]/gi, '-')}.ics`)
    },
  }
}
