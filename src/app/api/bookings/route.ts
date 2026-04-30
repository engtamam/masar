// GET /api/bookings - List bookings (filtered by role)
// POST /api/bookings - Create booking (checks quota, generates Jitsi link)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, createSuccessResponse, createErrorResponse } from '@/lib/middleware'
import { checkQuota, incrementQuotaUsage } from '@/lib/quotas'
import { generateJitsiLink } from '@/lib/jitsi'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    let where: Record<string, unknown> = {}

    if (user.role === 'ENTREPRENEUR') {
      const profile = await db.entrepreneurProfile.findUnique({
        where: { userId: user.userId },
      })
      if (!profile) return createErrorResponse('NOT_FOUND')
      where.entrepreneurId = profile.id
    } else if (user.role === 'CONSULTANT') {
      const profile = await db.consultantProfile.findUnique({
        where: { userId: user.userId },
      })
      if (!profile) return createErrorResponse('NOT_FOUND')
      where.consultantId = profile.id
    }
    // Admin sees all bookings

    if (status) {
      where.status = status
    }

    const [bookings, total] = await Promise.all([
      db.booking.findMany({
        where,
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
          milestoneProgress: {
            include: {
              milestoneDefault: {
                select: { id: true, titleEn: true, titleAr: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.booking.count({ where }),
    ])

    return createSuccessResponse({
      bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get bookings error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    if (user.role !== 'ENTREPRENEUR') {
      return createErrorResponse('INSUFFICIENT_PERMISSIONS')
    }

    const body = await request.json()
    const { consultantId, date, startTime, endTime, milestoneProgressId, notes } = body

    // Validate required fields
    if (!consultantId || !date || !startTime || !endTime) {
      return createErrorResponse('INVALID_INPUT')
    }

    // Validate date format and not in the past
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return Response.json(
        { success: false, error: 'Invalid date format, use YYYY-MM-DD' },
        { status: 400 }
      )
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const bookingDate = new Date(date + 'T00:00:00')
    if (bookingDate < today) {
      return Response.json(
        { success: false, error: 'Cannot book a date in the past' },
        { status: 400 }
      )
    }

    // Get entrepreneur profile
    const profile = await db.entrepreneurProfile.findUnique({
      where: { userId: user.userId },
    })
    if (!profile) {
      return createErrorResponse('NOT_FOUND')
    }

    // Check quota
    const quota = await checkQuota(profile.id)
    if (!quota.allowed) {
      return createErrorResponse('QUOTA_EXCEEDED')
    }

    // Verify consultant exists and is active
    const consultant = await db.consultantProfile.findFirst({
      where: { id: consultantId, isActive: true },
      include: { user: true },
    })
    if (!consultant) {
      return createErrorResponse('NOT_FOUND')
    }

    // Check for time slot conflicts
    const conflict = await db.booking.findFirst({
      where: {
        consultantId,
        date,
        status: { in: ['CONFIRMED'] },
        OR: [
          {
            startTime: { lte: startTime },
            endTime: { gt: startTime },
          },
          {
            startTime: { lt: endTime },
            endTime: { gte: endTime },
          },
        ],
      },
    })

    if (conflict) {
      return Response.json(
        { success: false, error: 'Time slot is already booked' },
        { status: 409 }
      )
    }

    // Generate Jitsi meeting link
    const meetingLink = await generateJitsiLink(milestoneProgressId || undefined)

    // Create booking
    const booking = await db.booking.create({
      data: {
        consultantId,
        entrepreneurId: profile.id,
        milestoneProgressId: milestoneProgressId || null,
        date,
        startTime,
        endTime,
        status: 'CONFIRMED',
        meetingLink,
        notes: notes || null,
      },
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
        milestoneProgress: {
          include: {
            milestoneDefault: {
              select: { id: true, titleEn: true, titleAr: true },
            },
          },
        },
      },
    })

    // Increment quota usage
    await incrementQuotaUsage(profile.id)

    // Notify consultant
    await db.notification.create({
      data: {
        userId: consultant.userId,
        title: 'New Booking',
        message: `${user.name} has booked a consultation with you on ${date} from ${startTime} to ${endTime}.`,
        type: 'info',
        link: '/bookings',
      },
    })

    return createSuccessResponse(booking, 201)
  } catch (error) {
    console.error('Create booking error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
