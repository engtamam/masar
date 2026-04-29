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
    const consultantId = url.searchParams.get('consultantId')

    if (!consultantId) {
      return createErrorResponse('INVALID_INPUT')
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
