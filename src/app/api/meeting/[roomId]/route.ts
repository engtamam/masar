// GET /api/meetings/[roomId] - Get meeting room info and check access
// Used by the meeting page to verify the user can join and get booking details

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, createSuccessResponse, createErrorResponse } from '@/lib/middleware'
import { checkMeetingTime } from '@/lib/meeting-time'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const { roomId } = await params

    // Find booking by meeting room ID
    const booking = await db.booking.findFirst({
      where: { meetingRoomId: roomId },
      include: {
        consultant: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true, email: true } },
            specialty: true,
          },
        },
        project: {
          include: {
            entrepreneur: {
              include: {
                user: { select: { id: true, name: true, avatarUrl: true, email: true } },
              },
            },
          },
        },
        milestoneProgress: {
          include: {
            milestoneDefault: {
              select: { id: true, titleEn: true, titleAr: true },
            },
          },
        },
      },
    })

    if (!booking) {
      return createErrorResponse('NOT_FOUND')
    }

    // Verify user has access to this meeting
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

    // Check meeting time access
    const timeCheck = checkMeetingTime(booking.date, booking.startTime, booking.endTime, booking.status)

    // Determine the other participant
    const otherParticipant = isEntrepreneur || isAdmin
      ? { id: booking.consultant.user.id, name: booking.consultant.user.name, avatarUrl: booking.consultant.user.avatarUrl, role: 'CONSULTANT' as const }
      : { id: booking.project?.entrepreneur?.user?.id || '', name: booking.project?.entrepreneur?.user?.name || '', avatarUrl: booking.project?.entrepreneur?.user?.avatarUrl || null, role: 'ENTREPRENEUR' as const }

    return createSuccessResponse({
      booking: {
        id: booking.id,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        notes: booking.notes,
        milestoneProgress: booking.milestoneProgress,
      },
      meetingRoomId: booking.meetingRoomId,
      timeCheck,
      otherParticipant,
      canJoin: timeCheck.canJoin,
      myRole: isEntrepreneur ? 'ENTREPRENEUR' : isConsultant ? 'CONSULTANT' : 'ADMIN',
    })
  } catch (error) {
    console.error('Get meeting error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
