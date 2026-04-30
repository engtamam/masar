// DELETE /api/bookings/availability/[id] - Delete a single availability slot

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole, createSuccessResponse, createErrorResponse } from '@/lib/middleware'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const checkRole = requireRole('CONSULTANT')
    checkRole(user)

    const { id } = await params

    // Get consultant profile
    const profile = await db.consultantProfile.findUnique({
      where: { userId: user.userId },
    })
    if (!profile) {
      return createErrorResponse('NOT_FOUND')
    }

    // Find the slot and verify ownership
    const slot = await db.consultantAvailability.findUnique({
      where: { id },
    })

    if (!slot) {
      return createErrorResponse('NOT_FOUND')
    }

    if (slot.consultantId !== profile.id) {
      return createErrorResponse('INSUFFICIENT_PERMISSIONS')
    }

    // Soft delete (set isActive = false) to preserve history
    await db.consultantAvailability.update({
      where: { id },
      data: { isActive: false },
    })

    return createSuccessResponse({ message: 'Slot deleted successfully' })
  } catch (error) {
    if (error instanceof Error && (error.message === 'AUTH_REQUIRED' || error.message === 'INSUFFICIENT_PERMISSIONS')) {
      return createErrorResponse(error.message)
    }
    console.error('Delete availability slot error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
