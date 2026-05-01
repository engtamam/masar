// PATCH /api/bookings/[id] - Update booking status (cancel, complete, start meeting)
// DELETE /api/bookings/[id] - Cancel booking

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, createSuccessResponse, createErrorResponse } from '@/lib/middleware'
import { decrementQuotaUsage } from '@/lib/quotas'
import { checkMeetingTime, generateMeetingUrl } from '@/lib/meeting-time'

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
        project: {
          include: {
            entrepreneur: {
              include: { user: true },
            },
          },
        },
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

    // Check entrepreneur access through project ownership
    const isEntrepreneur = entrepreneurProfile && booking.project?.entrepreneurId === entrepreneurProfile.id
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
      if (booking.project?.entrepreneurId) {
        await decrementQuotaUsage(booking.project.entrepreneurId)
      }
    } else if (status === 'IN_PROGRESS') {
      // Start meeting - only allowed if within time window
      if (booking.status !== 'CONFIRMED') {
        return Response.json(
          { success: false, error: 'Only confirmed bookings can be started' },
          { status: 400 }
        )
      }

      // Verify meeting time
      const timeCheck = checkMeetingTime(booking.date, booking.startTime, booking.endTime, booking.status)
      if (!timeCheck.canJoin) {
        return Response.json(
          { success: false, error: timeCheck.messageAr || timeCheck.message },
          { status: 400 }
        )
      }

      updateData.status = 'IN_PROGRESS'
      updateData.startedAt = new Date()
    } else if (status === 'COMPLETED') {
      if (booking.status !== 'CONFIRMED' && booking.status !== 'IN_PROGRESS') {
        return Response.json(
          { success: false, error: 'Only confirmed or in-progress bookings can be completed' },
          { status: 400 }
        )
      }
      updateData.status = 'COMPLETED'
      updateData.endedAt = new Date()
    } else if (status === 'NO_SHOW') {
      if (booking.status !== 'CONFIRMED' && booking.status !== 'IN_PROGRESS') {
        return Response.json(
          { success: false, error: 'Only confirmed or in-progress bookings can be marked as no-show' },
          { status: 400 }
        )
      }
      updateData.status = 'NO_SHOW'
      updateData.endedAt = new Date()
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
        project: {
          include: {
            entrepreneur: {
              include: {
                user: { select: { id: true, name: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    })

    // Notify the other party about status change
    const notifyUserId = isEntrepreneur || isAdmin ? booking.consultant.userId : booking.project?.entrepreneur?.user?.id
    if (notifyUserId) {
      const statusMessages: Record<string, string> = {
        CANCELLED: `حجز ${booking.date} تم إلغاؤه. ${cancellationReason || ''}`,
        IN_PROGRESS: `اجتماع ${booking.date} بدأ الآن.`,
        COMPLETED: `اجتماع ${booking.date} اكتمل.`,
        NO_SHOW: `اجتماع ${booking.date} تم تسجيله كحضور متأخر.`,
      }

      await db.notification.create({
        data: {
          userId: notifyUserId,
          title: 'تحديث الحجز',
          message: statusMessages[status] || `تم تحديث حالة الحجز إلى ${status}`,
          type: status === 'COMPLETED' ? 'success' : status === 'CANCELLED' ? 'warning' : 'info',
          link: '/bookings',
        },
      })
    }

    // Add meetingUrl to response
    const updatedWithUrl = {
      ...updated,
      meetingUrl: updated.meetingRoomId ? generateMeetingUrl(updated.meetingRoomId) : null,
    }

    return createSuccessResponse(updatedWithUrl)
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
        project: {
          include: {
            entrepreneur: {
              include: { user: true },
            },
          },
        },
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

    const isEntrepreneur = entrepreneurProfile && booking.project?.entrepreneurId === entrepreneurProfile.id
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
    if (booking.project?.entrepreneurId) {
      await decrementQuotaUsage(booking.project.entrepreneurId)
    }

    // Notify other party
    const notifyUserId = isEntrepreneur || isAdmin ? booking.consultant.userId : booking.project?.entrepreneur?.user?.id
    if (notifyUserId) {
      await db.notification.create({
        data: {
          userId: notifyUserId,
          title: 'إلغاء الحجز',
          message: `حجز ${booking.date} من ${booking.startTime} إلى ${booking.endTime} تم إلغاؤه.`,
          type: 'warning',
          link: '/bookings',
        },
      })
    }

    return createSuccessResponse(updated)
  } catch (error) {
    console.error('Delete booking error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
