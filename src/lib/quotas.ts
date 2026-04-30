// Quota System
// Manages monthly booking quotas for entrepreneurs

import { db } from './db'
import { getConfigNumber } from './config'

/**
 * Get current month in YYYY-MM format
 */
function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Check if an entrepreneur has remaining quota for bookings
 * Returns { allowed: boolean, used: number, limit: number }
 */
export async function checkQuota(entrepreneurId: string): Promise<{
  allowed: boolean
  used: number
  limit: number
  remaining: number
}> {
  const currentMonth = getCurrentMonth()
  const defaultLimit = await getConfigNumber('DEFAULT_MONTHLY_QUOTA')

  let quota = await db.quota.findUnique({
    where: { entrepreneurId },
  })

  // Auto-reset if month has changed
  if (quota && quota.currentMonth !== currentMonth) {
    quota = await db.quota.update({
      where: { id: quota.id },
      data: {
        bookingsUsedThisMonth: 0,
        currentMonth,
      },
    })
  }

  // Determine the effective limit
  const limit = quota
    ? quota.isExempted
      ? (quota.customLimit ?? 999) // Exempted users get high limit unless custom is set
      : quota.monthlyBookingLimit
    : defaultLimit

  const used = quota?.bookingsUsedThisMonth ?? 0

  return {
    allowed: used < limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  }
}

/**
 * Increment the quota usage after a successful booking
 */
export async function incrementQuotaUsage(entrepreneurId: string): Promise<void> {
  const currentMonth = getCurrentMonth()
  const defaultLimit = await getConfigNumber('DEFAULT_MONTHLY_QUOTA')

  await db.quota.upsert({
    where: { entrepreneurId },
    update: {
      bookingsUsedThisMonth: { increment: 1 },
      currentMonth,
    },
    create: {
      entrepreneurId,
      monthlyBookingLimit: defaultLimit,
      bookingsUsedThisMonth: 1,
      currentMonth,
    },
  })
}

/**
 * Decrement quota usage (e.g., when a booking is cancelled)
 */
export async function decrementQuotaUsage(entrepreneurId: string): Promise<void> {
  const currentMonth = getCurrentMonth()

  const quota = await db.quota.findUnique({ where: { entrepreneurId } })
  if (quota && quota.bookingsUsedThisMonth > 0) {
    await db.quota.update({
      where: { id: quota.id },
      data: {
        bookingsUsedThisMonth: { decrement: 1 },
        currentMonth,
      },
    })
  }
}

/**
 * Reset all monthly quotas - for cron job use
 * Resets bookingsUsedThisMonth to 0 and updates currentMonth
 */
export async function resetMonthlyQuotas(): Promise<number> {
  const currentMonth = getCurrentMonth()

  const result = await db.quota.updateMany({
    where: {
      currentMonth: { not: currentMonth },
    },
    data: {
      bookingsUsedThisMonth: 0,
      currentMonth,
    },
  })

  return result.count
}

/**
 * Get or create a quota record for an entrepreneur
 */
export async function getOrCreateQuota(entrepreneurId: string) {
  const currentMonth = getCurrentMonth()
  const defaultLimit = await getConfigNumber('DEFAULT_MONTHLY_QUOTA')

  return db.quota.upsert({
    where: { entrepreneurId },
    update: {},
    create: {
      entrepreneurId,
      monthlyBookingLimit: defaultLimit,
      bookingsUsedThisMonth: 0,
      currentMonth,
    },
  })
}
