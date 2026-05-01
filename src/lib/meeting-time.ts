// Meeting Time Control - Manages meeting scheduling and time enforcement
// Ensures meetings can only start within their scheduled window
// and automatically end when time expires

/**
 * How early (in minutes) a user can join a meeting before its start time
 */
const EARLY_JOIN_MINUTES = 5

/**
 * Meeting status returned by the time checker
 */
export type MeetingTimeStatus =
  | 'TOO_EARLY'      // Meeting hasn't opened yet (more than EARLY_JOIN_MINUTES before start)
  | 'WAITING_ROOM'   // Within EARLY_JOIN_MINUTES of start time - can join waiting room
  | 'IN_PROGRESS'    // Currently within the scheduled time window
  | 'TIME_UP'        // Meeting time has expired
  | 'ALREADY_ENDED'  // Booking was already marked COMPLETED or NO_SHOW

/**
 * Result of meeting time check
 */
export interface MeetingTimeResult {
  status: MeetingTimeStatus
  canJoin: boolean
  message: string
  messageAr: string
  secondsUntilStart?: number  // Countdown to meeting start (only for WAITING_ROOM)
  secondsUntilEnd?: number    // Countdown to meeting end (only for IN_PROGRESS)
  meetingStart: Date
  meetingEnd: Date
}

/**
 * Parse a date string (YYYY-MM-DD) and time string (HH:mm) into a Date object
 * Uses the server's local timezone interpretation
 */
export function parseDateTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes] = timeStr.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes, 0, 0)
}

/**
 * Check if a meeting can be joined based on its scheduled time
 * @param dateStr - Meeting date in YYYY-MM-DD format
 * @param startTimeStr - Meeting start time in HH:mm format
 * @param endTimeStr - Meeting end time in HH:mm format
 * @param bookingStatus - Current booking status
 * @param now - Current time (defaults to new Date())
 */
export function checkMeetingTime(
  dateStr: string,
  startTimeStr: string,
  endTimeStr: string,
  bookingStatus: string,
  now: Date = new Date()
): MeetingTimeResult {
  const meetingStart = parseDateTime(dateStr, startTimeStr)
  const meetingEnd = parseDateTime(dateStr, endTimeStr)
  const earlyJoinTime = new Date(meetingStart.getTime() - EARLY_JOIN_MINUTES * 60 * 1000)

  // If booking is already completed or no-show, meeting is over
  if (bookingStatus === 'COMPLETED' || bookingStatus === 'NO_SHOW' || bookingStatus === 'CANCELLED') {
    return {
      status: 'ALREADY_ENDED',
      canJoin: false,
      message: 'This meeting has already ended.',
      messageAr: 'هذا الاجتماع انتهى بالفعل.',
      meetingStart,
      meetingEnd,
    }
  }

  // Too early - more than EARLY_JOIN_MINUTES before start
  if (now < earlyJoinTime) {
    const secondsUntilStart = Math.floor((meetingStart.getTime() - now.getTime()) / 1000)
    return {
      status: 'TOO_EARLY',
      canJoin: false,
      message: `Meeting opens ${EARLY_JOIN_MINUTES} minutes before start time.`,
      messageAr: `يفتح الاجتماع قبل ${EARLY_JOIN_MINUTES} دقائق من موعده.`,
      secondsUntilStart,
      meetingStart,
      meetingEnd,
    }
  }

  // Waiting room - within EARLY_JOIN_MINUTES before start
  if (now >= earlyJoinTime && now < meetingStart) {
    const secondsUntilStart = Math.floor((meetingStart.getTime() - now.getTime()) / 1000)
    return {
      status: 'WAITING_ROOM',
      canJoin: true,
      message: 'Meeting will start soon. You can join the waiting room.',
      messageAr: 'الاجتماع سيبدأ قريباً. يمكنك دخول غرفة الانتظار.',
      secondsUntilStart,
      meetingStart,
      meetingEnd,
    }
  }

  // In progress - within the scheduled window
  if (now >= meetingStart && now < meetingEnd) {
    const secondsUntilEnd = Math.floor((meetingEnd.getTime() - now.getTime()) / 1000)
    return {
      status: 'IN_PROGRESS',
      canJoin: true,
      message: 'Meeting is in progress.',
      messageAr: 'الاجتماع جارٍ الآن.',
      secondsUntilEnd,
      meetingStart,
      meetingEnd,
    }
  }

  // Time's up
  return {
    status: 'TIME_UP',
    canJoin: false,
    message: 'Meeting time has expired.',
    messageAr: 'انتهى وقت الاجتماع.',
    secondsUntilEnd: 0,
    meetingStart,
    meetingEnd,
  }
}

/**
 * Format seconds into a human-readable countdown string (Arabic)
 */
export function formatCountdownAr(seconds: number): string {
  if (seconds <= 0) return 'الآن'
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const parts: string[] = []
  if (hours > 0) parts.push(`${hours} ساعة`)
  if (mins > 0) parts.push(`${mins} دقيقة`)
  if (secs > 0 && hours === 0) parts.push(`${secs} ثانية`)

  return parts.join(' و ') || 'الآن'
}

/**
 * Format seconds into a human-readable countdown string (English)
 */
export function formatCountdownEn(seconds: number): string {
  if (seconds <= 0) return 'now'
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const parts: string[] = []
  if (hours > 0) parts.push(`${hours}h`)
  if (mins > 0) parts.push(`${mins}m`)
  if (secs > 0 && hours === 0) parts.push(`${secs}s`)

  return parts.join(' ') || 'now'
}

/**
 * Generate a unique meeting room ID
 * Format: masar-room-{random}-{timestamp}
 */
export function generateMeetingRoomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let random = ''
  for (let i = 0; i < 8; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `masar-room-${random}-${Date.now()}`
}

/**
 * Generate a local meeting URL from room ID
 * This URL points to the internal meeting page, not an external service
 */
export function generateMeetingUrl(roomId: string): string {
  return `/meeting/${roomId}`
}

/**
 * Calculate meeting duration in minutes
 */
export function getMeetingDurationMinutes(startTimeStr: string, endTimeStr: string): number {
  const [startH, startM] = startTimeStr.split(':').map(Number)
  const [endH, endM] = endTimeStr.split(':').map(Number)
  return (endH * 60 + endM) - (startH * 60 + startM)
}
