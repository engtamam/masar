// PATCH /api/bookings/[id] - Update booking status (cancel, complete)
// DELETE /api/bookings/[id] - Cancel booking

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, createSuccessResponse, createErrorResponse } from '@/lib/middleware'
import { decrementQuotaUsage } from '@/lib/quotas'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const { id } = await params
    const body = await request.json()
    const { status, cancellationReason } = body

    // Find the booking
    const booking = await db.booking.findUnique({
      where: { id },
      include: {
        consultant: { include: { user: true } },
        entrepreneur: { include: { user: true } },
      },
    })

    if (!booking) {
      return createErrorResponse('NOT_FOUND')
    }

    // Verify user has access to this booking
    const entrepreneurProfile = user.role === 'ENTREPRENEUR'
      ? await db.entrepreneurProfile.findUnique({ where: { userId: user.userId } })
      : null
    const consultantProfile = user.role === 'CONSULTANT'
      ? await db.consultantProfile.findUnique({ where: { userId: user.userId } })
      : null

    const isEntrepreneur = entrepreneurProfile && booking.entrepreneurId === entrepreneurProfile.id
    const isConsultant = consultantProfile && booking.consultantId === consultantProfile.id
    const isAdmin = user.role === 'ADMIN'

    if (!isEntrepreneur && !isConsultant && !isAdmin) {
      return createErrorResponse('INSUFFICIENT_PERMISSIONS')
    }

    const updateData: Record<string, unknown> = {}

    if (status === 'CANCELLED') {
      if (booking.status !== 'CONFIRMED') {
        return Response.json(
          { success: false, error: 'Only confirmed bookings can be cancelled' },
          { status: 400 }
        )
      }
      updateData.status = 'CANCELLED'
      updateData.cancellationReason = cancellationReason || null

      // Decrement quota usage since booking is cancelled
      await decrementQuotaUsage(booking.entrepreneurId)
    } else if (status === 'COMPLETED') {
      if (booking.status !== 'CONFIRMED') {
        return Response.json(
          { success: false, error: 'Only confirmed bookings can be completed' },
          { status: 400 }
        )
      }
      updateData.status = 'COMPLETED'
    } else if (status === 'NO_SHOW') {
      if (booking.status !== 'CONFIRMED') {
        return Response.json(
          { success: false, error: 'Only confirmed bookings can be marked as no-show' },
          { status: 400 }
        )
      }
      updateData.status = 'NO_SHOW'
    } else {
      return Response.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      )
    }

    const updated = await db.booking.update({
      where: { id },
      data: updateData,
      include: {
        consultant: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
            specialty: true,
          },
        },
        entrepreneur: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    })

    // Notify the other party about status change
    const notifyUserId = isEntrepreneur || isAdmin ? booking.consultant.userId : booking.entrepreneur.user.id
    const statusMessages: Record<string, string> = {
      CANCELLED: `Booking on ${booking.date} has been cancelled. ${cancellationReason || ''}`,
      COMPLETED: `Booking on ${booking.date} has been marked as completed.`,
      NO_SHOW: `Booking on ${booking.date} has been marked as no-show.`,
    }

    await db.notification.create({
      data: {
        userId: notifyUserId,
        title: 'Booking Updated',
        message: statusMessages[status] || `Booking status updated to ${status}`,
        type: status === 'COMPLETED' ? 'success' : status === 'CANCELLED' ? 'warning' : 'info',
        link: '/bookings',
      },
    })

    return createSuccessResponse(updated)
  } catch (error) {
    console.error('Update booking error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const { id } = await params

    const booking = await db.booking.findUnique({
      where: { id },
      include: {
        consultant: { include: { user: true } },
        entrepreneur: { include: { user: true } },
      },
    })

    if (!booking) {
      return createErrorResponse('NOT_FOUND')
    }

    // Only allow cancellation of CONFIRMED bookings
    if (booking.status !== 'CONFIRMED') {
      return Response.json(
        { success: false, error: 'Only confirmed bookings can be cancelled' },
        { status: 400 }
      )
    }

    // Verify user has access
    const entrepreneurProfile = user.role === 'ENTREPRENEUR'
      ? await db.entrepreneurProfile.findUnique({ where: { userId: user.userId } })
      : null
    const consultantProfile = user.role === 'CONSULTANT'
      ? await db.consultantProfile.findUnique({ where: { userId: user.userId } })
      : null

    const isEntrepreneur = entrepreneurProfile && booking.entrepreneurId === entrepreneurProfile.id
    const isConsultant = consultantProfile && booking.consultantId === consultantProfile.id
    const isAdmin = user.role === 'ADMIN'

    if (!isEntrepreneur && !isConsultant && !isAdmin) {
      return createErrorResponse('INSUFFICIENT_PERMISSIONS')
    }

    // Cancel the booking (soft delete via status)
    const updated = await db.booking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancellationReason: 'Cancelled by user',
      },
    })

    // Decrement quota usage
    await decrementQuotaUsage(booking.entrepreneurId)

    // Notify other party
    const notifyUserId = isEntrepreneur || isAdmin ? booking.consultant.userId : booking.entrepreneur.user.id
    await db.notification.create({
      data: {
        userId: notifyUserId,
        title: 'Booking Cancelled',
        message: `Booking on ${booking.date} from ${booking.startTime} to ${booking.endTime} has been cancelled.`,
        type: 'warning',
        link: '/bookings',
      },
    })

    return createSuccessResponse(updated)
  } catch (error) {
    console.error('Delete booking error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
