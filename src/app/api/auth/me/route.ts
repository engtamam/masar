// GET /api/auth/me
// Get current authenticated user profile

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, createSuccessResponse, createErrorResponse } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    // Fetch full user profile with related data
    const fullUser = await db.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        phone: true,
        isActive: true,
        createdAt: true,
        consultantProfile: {
          include: {
            specialty: true,
          },
        },
        entrepreneurProfile: {
          include: {
            quota: true,
          },
        },
      },
    })

    if (!fullUser) {
      return createErrorResponse('NOT_FOUND')
    }

    // Get unread notification count
    const unreadNotifications = await db.notification.count({
      where: {
        userId: user.userId,
        isRead: false,
      },
    })

    return createSuccessResponse({
      ...fullUser,
      unreadNotifications,
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
