// GET /api/admin/quotas - List all quotas with entrepreneur info
// PATCH /api/admin/quotas - Update quota (set limit, exempt status, custom limit)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole, createSuccessResponse, createErrorResponse } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const checkRole = requireRole('ADMIN')
    checkRole(user)

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const search = url.searchParams.get('search')
    const skip = (page - 1) * limit

    // Build where clause for entrepreneur profiles
    let entrepreneurWhere: Record<string, unknown> = {}
    if (search) {
      entrepreneurWhere.OR = [
        { projectName: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
      ]
    }

    const [quotas, total] = await Promise.all([
      db.quota.findMany({
        include: {
          entrepreneur: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        where: entrepreneurWhere.id ? { entrepreneur: entrepreneurWhere } : {},
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.quota.count(),
    ])

    return createSuccessResponse({
      quotas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_PERMISSIONS') {
      return createErrorResponse(error.message)
    }
    console.error('List quotas error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const checkRole = requireRole('ADMIN')
    checkRole(user)

    const body = await request.json()
    const { id, monthlyBookingLimit, isExempted, customLimit, bookingsUsedThisMonth } = body

    if (!id) {
      return createErrorResponse('INVALID_INPUT')
    }

    const existing = await db.quota.findUnique({ where: { id } })
    if (!existing) {
      return createErrorResponse('NOT_FOUND')
    }

    const updateData: Record<string, unknown> = {}
    if (monthlyBookingLimit !== undefined) {
      if (typeof monthlyBookingLimit !== 'number' || monthlyBookingLimit < 0) {
        return Response.json(
          { success: false, error: 'Monthly booking limit must be a non-negative number' },
          { status: 400 }
        )
      }
      updateData.monthlyBookingLimit = monthlyBookingLimit
    }
    if (isExempted !== undefined) {
      updateData.isExempted = Boolean(isExempted)
    }
    if (customLimit !== undefined) {
      if (customLimit !== null && (typeof customLimit !== 'number' || customLimit < 0)) {
        return Response.json(
          { success: false, error: 'Custom limit must be a non-negative number or null' },
          { status: 400 }
        )
      }
      updateData.customLimit = customLimit
    }
    if (bookingsUsedThisMonth !== undefined) {
      if (typeof bookingsUsedThisMonth !== 'number' || bookingsUsedThisMonth < 0) {
        return Response.json(
          { success: false, error: 'Bookings used must be a non-negative number' },
          { status: 400 }
        )
      }
      updateData.bookingsUsedThisMonth = bookingsUsedThisMonth
    }

    const updated = await db.quota.update({
      where: { id },
      data: updateData,
      include: {
        entrepreneur: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    return createSuccessResponse(updated)
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_PERMISSIONS') {
      return createErrorResponse(error.message)
    }
    console.error('Update quota error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
