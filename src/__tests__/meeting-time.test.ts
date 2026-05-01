// Tests for meeting-time.ts - Meeting time control utilities
import { describe, it, expect } from 'vitest'
import {
  parseDateTime,
  checkMeetingTime,
  formatCountdownAr,
  formatCountdownEn,
  generateMeetingRoomId,
  generateMeetingUrl,
  getMeetingDurationMinutes,
} from '@/lib/meeting-time'

describe('parseDateTime', () => {
  it('should parse a valid date and time string', () => {
    const result = parseDateTime('2024-06-15', '14:30')
    expect(result.getFullYear()).toBe(2024)
    expect(result.getMonth()).toBe(5) // 0-indexed
    expect(result.getDate()).toBe(15)
    expect(result.getHours()).toBe(14)
    expect(result.getMinutes()).toBe(30)
  })

  it('should parse midnight correctly', () => {
    const result = parseDateTime('2024-01-01', '00:00')
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
  })

  it('should parse end of day correctly', () => {
    const result = parseDateTime('2024-12-31', '23:59')
    expect(result.getHours()).toBe(23)
    expect(result.getMinutes()).toBe(59)
  })
})

describe('checkMeetingTime', () => {
  it('should return ALREADY_ENDED for COMPLETED bookings', () => {
    const now = new Date('2024-06-15T14:00:00')
    const result = checkMeetingTime('2024-06-15', '14:00', '15:00', 'COMPLETED', now)
    expect(result.status).toBe('ALREADY_ENDED')
    expect(result.canJoin).toBe(false)
  })

  it('should return ALREADY_ENDED for NO_SHOW bookings', () => {
    const now = new Date('2024-06-15T14:00:00')
    const result = checkMeetingTime('2024-06-15', '14:00', '15:00', 'NO_SHOW', now)
    expect(result.status).toBe('ALREADY_ENDED')
    expect(result.canJoin).toBe(false)
  })

  it('should return ALREADY_ENDED for CANCELLED bookings', () => {
    const now = new Date('2024-06-15T14:00:00')
    const result = checkMeetingTime('2024-06-15', '14:00', '15:00', 'CANCELLED', now)
    expect(result.status).toBe('ALREADY_ENDED')
    expect(result.canJoin).toBe(false)
  })

  it('should return TOO_EARLY when more than 5 minutes before start', () => {
    const now = new Date('2024-06-15T13:54:59') // 5 min 1 sec before
    const result = checkMeetingTime('2024-06-15', '14:00', '15:00', 'CONFIRMED', now)
    expect(result.status).toBe('TOO_EARLY')
    expect(result.canJoin).toBe(false)
    expect(result.secondsUntilStart).toBeGreaterThan(0)
  })

  it('should return WAITING_ROOM when within 5 minutes before start', () => {
    const now = new Date('2024-06-15T13:55:00') // exactly 5 min before
    const result = checkMeetingTime('2024-06-15', '14:00', '15:00', 'CONFIRMED', now)
    expect(result.status).toBe('WAITING_ROOM')
    expect(result.canJoin).toBe(true)
  })

  it('should return WAITING_ROOM when 1 minute before start', () => {
    const now = new Date('2024-06-15T13:59:00')
    const result = checkMeetingTime('2024-06-15', '14:00', '15:00', 'CONFIRMED', now)
    expect(result.status).toBe('WAITING_ROOM')
    expect(result.canJoin).toBe(true)
  })

  it('should return IN_PROGRESS when during meeting time', () => {
    const now = new Date('2024-06-15T14:30:00') // 30 min into meeting
    const result = checkMeetingTime('2024-06-15', '14:00', '15:00', 'CONFIRMED', now)
    expect(result.status).toBe('IN_PROGRESS')
    expect(result.canJoin).toBe(true)
    expect(result.secondsUntilEnd).toBeGreaterThan(0)
  })

  it('should return IN_PROGRESS at exact start time', () => {
    const now = new Date('2024-06-15T14:00:00')
    const result = checkMeetingTime('2024-06-15', '14:00', '15:00', 'CONFIRMED', now)
    expect(result.status).toBe('IN_PROGRESS')
    expect(result.canJoin).toBe(true)
  })

  it('should return TIME_UP when meeting time has passed', () => {
    const now = new Date('2024-06-15T15:00:00')
    const result = checkMeetingTime('2024-06-15', '14:00', '15:00', 'CONFIRMED', now)
    expect(result.status).toBe('TIME_UP')
    expect(result.canJoin).toBe(false)
  })

  it('should return TIME_UP well after meeting end', () => {
    const now = new Date('2024-06-15T16:00:00')
    const result = checkMeetingTime('2024-06-15', '14:00', '15:00', 'CONFIRMED', now)
    expect(result.status).toBe('TIME_UP')
    expect(result.canJoin).toBe(false)
  })

  it('should return WAITING_ROOM for IN_PROGRESS booking status within time', () => {
    const now = new Date('2024-06-15T13:56:00')
    const result = checkMeetingTime('2024-06-15', '14:00', '15:00', 'IN_PROGRESS', now)
    expect(result.status).toBe('WAITING_ROOM')
    expect(result.canJoin).toBe(true)
  })
})

describe('formatCountdownAr', () => {
  it('should return الآن for zero seconds', () => {
    expect(formatCountdownAr(0)).toBe('الآن')
  })

  it('should format seconds only', () => {
    expect(formatCountdownAr(45)).toBe('45 ثانية')
  })

  it('should format minutes and seconds', () => {
    expect(formatCountdownAr(125)).toBe('2 دقيقة و 5 ثانية')
  })

  it('should format hours and minutes', () => {
    expect(formatCountdownAr(3665)).toBe('1 ساعة و 1 دقيقة')
  })

  it('should format hours only', () => {
    expect(formatCountdownAr(3600)).toBe('1 ساعة')
  })
})

describe('formatCountdownEn', () => {
  it('should return now for zero seconds', () => {
    expect(formatCountdownEn(0)).toBe('now')
  })

  it('should format seconds', () => {
    expect(formatCountdownEn(45)).toBe('45s')
  })

  it('should format minutes and seconds', () => {
    expect(formatCountdownEn(125)).toBe('2m 5s')
  })

  it('should format hours and minutes', () => {
    expect(formatCountdownEn(3665)).toBe('1h 1m')
  })
})

describe('generateMeetingRoomId', () => {
  it('should generate a string starting with masar-room-', () => {
    const id = generateMeetingRoomId()
    expect(id).toMatch(/^masar-room-/)
  })

  it('should generate unique IDs', () => {
    const id1 = generateMeetingRoomId()
    const id2 = generateMeetingRoomId()
    expect(id1).not.toBe(id2)
  })

  it('should contain 8 random characters', () => {
    const id = generateMeetingRoomId()
    const parts = id.split('-')
    // masar-room-{8chars}-{timestamp}
    expect(parts[2].length).toBe(8)
  })
})

describe('generateMeetingUrl', () => {
  it('should generate correct meeting URL', () => {
    const url = generateMeetingUrl('test-room-123')
    expect(url).toBe('/meeting/test-room-123')
  })
})

describe('getMeetingDurationMinutes', () => {
  it('should calculate duration correctly for 1 hour', () => {
    expect(getMeetingDurationMinutes('14:00', '15:00')).toBe(60)
  })

  it('should calculate duration correctly for 30 minutes', () => {
    expect(getMeetingDurationMinutes('10:00', '10:30')).toBe(30)
  })

  it('should calculate duration across noon', () => {
    expect(getMeetingDurationMinutes('11:30', '12:30')).toBe(60)
  })

  it('should calculate duration for short meeting', () => {
    expect(getMeetingDurationMinutes('09:00', '09:15')).toBe(15)
  })
})
