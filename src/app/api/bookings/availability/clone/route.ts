// POST /api/bookings/availability/clone
// Clone previous month's schedule

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole, createSuccessResponse, createErrorResponse } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const checkRole = requireRole('CONSULTANT')
    checkRole(user)

    // Get consultant profile
    const profile = await db.consultantProfile.findUnique({
      where: { userId: user.userId },
    })
    if (!profile) {
      return createErrorResponse('NOT_FOUND')
    }

    // Get current recurring availabilities
    const currentAvailabilities = await db.consultantAvailability.findMany({
      where: {
        consultantId: profile.id,
        isRecurring: true,
        isActive: true,
      },
    })

    if (currentAvailabilities.length === 0) {
      return Response.json(
        { success: false, error: 'No recurring availability to clone' },
        { status: 400 }
      )
    }

    // The recurring availabilities are already active and don't need cloning
    // This endpoint is for creating specific date slots based on the recurring pattern
    const body = await request.json()
    const { month } = body as { month?: string } // YYYY-MM format

    if (!month) {
      return createErrorResponse('INVALID_INPUT')
    }

    // Generate specific date slots for the given month based on recurring pattern
    const [year, monthNum] = month.split('-').map(Number)
    const daysInMonth = new Date(year, monthNum, 0).getDate()

    const specificSlots: Array<{
      consultantId: string
      dayOfWeek: number
      startTime: string
      endTime: string
      slotDuration: number
      isRecurring: boolean
      specificDate: string
      isActive: boolean
    }> = []

    for (const avail of currentAvailabilities) {
      // Find all dates in the month that match the day of week
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, monthNum - 1, day)
        if (date.getDay() === avail.dayOfWeek) {
          const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`

          // Check if a slot already exists for this date and time
          const exists = await db.consultantAvailability.findFirst({
            where: {
              consultantId: profile.id,
              specificDate: dateStr,
              startTime: avail.startTime,
              endTime: avail.endTime,
              isActive: true,
            },
          })

          if (!exists) {
            specificSlots.push({
              consultantId: profile.id,
              dayOfWeek: avail.dayOfWeek,
              startTime: avail.startTime,
              endTime: avail.endTime,
              slotDuration: avail.slotDuration,
              isRecurring: false,
              specificDate: dateStr,
              isActive: true,
            })
          }
        }
      }
    }

    if (specificSlots.length > 0) {
      await db.consultantAvailability.createMany({
        data: specificSlots,
      })
    }

    return createSuccessResponse({
      message: `Cloned ${specificSlots.length} slots for ${month}`,
      count: specificSlots.length,
    })
  } catch (error) {
    if (error instanceof Error && (error.message === 'AUTH_REQUIRED' || error.message === 'INSUFFICIENT_PERMISSIONS')) {
      return createErrorResponse(error.message)
    }
    console.error('Clone availability error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
