// GET /api/bookings/availability - Get consultant availability slots
// POST /api/bookings/availability - Set availability (consultant only)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole, createSuccessResponse, createErrorResponse } from '@/lib/middleware'
import { getConfigNumber } from '@/lib/config'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const url = new URL(request.url)
    let consultantId = url.searchParams.get('consultantId')

    if (!consultantId) {
      return createErrorResponse('INVALID_INPUT')
    }

    // If consultantId=me, resolve to the consultant's profile ID
    if (consultantId === 'me') {
      const profile = await db.consultantProfile.findUnique({
        where: { userId: user.userId },
      })
      if (!profile) {
        return createErrorResponse('NOT_FOUND')
      }
      consultantId = profile.id
    }

    const availabilities = await db.consultantAvailability.findMany({
      where: {
        consultantId,
        isActive: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    })

    return createSuccessResponse(availabilities)
  } catch (error) {
    console.error('Get availability error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const checkRole = requireRole('CONSULTANT')
    checkRole(user)

    const body = await request.json()
    const { slots } = body as {
      slots: Array<{
        dayOfWeek: number
        startTime: string
        endTime: string
        slotDuration?: number
        isRecurring?: boolean
        specificDate?: string
      }>
    }

    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      return createErrorResponse('INVALID_INPUT')
    }

    // Validate each slot
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i]
      if (slot.dayOfWeek < 0 || slot.dayOfWeek > 6 || !Number.isInteger(slot.dayOfWeek)) {
        return Response.json(
          { success: false, error: `Invalid dayOfWeek for slot ${i + 1}: must be 0-6` },
          { status: 400 }
        )
      }
      if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
        return Response.json(
          { success: false, error: `Invalid time format for slot ${i + 1}: use HH:mm` },
          { status: 400 }
        )
      }
      if (slot.startTime >= slot.endTime) {
        return Response.json(
          { success: false, error: `Invalid time range for slot ${i + 1}: startTime must be before endTime` },
          { status: 400 }
        )
      }
      if (slot.slotDuration !== undefined && (slot.slotDuration < 15 || slot.slotDuration > 120)) {
        return Response.json(
          { success: false, error: `Invalid slotDuration for slot ${i + 1}: must be 15-120 minutes` },
          { status: 400 }
        )
      }
    }

    // Get consultant profile
    const profile = await db.consultantProfile.findUnique({
      where: { userId: user.userId },
    })
    if (!profile) {
      return createErrorResponse('NOT_FOUND')
    }

    const defaultSlotDuration = await getConfigNumber('DEFAULT_SLOT_DURATION')

    // Create availability slots
    const created = await db.consultantAvailability.createMany({
      data: slots.map((slot) => ({
        consultantId: profile.id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        slotDuration: slot.slotDuration || defaultSlotDuration,
        isRecurring: slot.isRecurring ?? true,
        specificDate: slot.specificDate || null,
        isActive: true,
      })),
    })

    return createSuccessResponse({ count: created.count }, 201)
  } catch (error) {
    if (error instanceof Error && (error.message === 'AUTH_REQUIRED' || error.message === 'INSUFFICIENT_PERMISSIONS')) {
      return createErrorResponse(error.message)
    }
    console.error('Set availability error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
