// GET /api/notifications - List user's notifications
// PATCH /api/notifications - Mark notification(s) as read
// DELETE /api/notifications - Clear all notifications for user

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, createSuccessResponse, createErrorResponse } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true'
    const type = url.searchParams.get('type')
    const skip = (page - 1) * limit

    // Build where clause
    let where: Record<string, unknown> = { userId: user.userId }
    if (unreadOnly) {
      where.isRead = false
    }
    if (type) {
      where.type = type
    }

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.notification.count({ where }),
    ])

    // Get unread count
    const unreadCount = await db.notification.count({
      where: { userId: user.userId, isRead: false },
    })

    return createSuccessResponse({
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const body = await request.json()
    const { id, markAllRead } = body

    if (markAllRead) {
      // Mark all notifications as read for this user
      await db.notification.updateMany({
        where: { userId: user.userId, isRead: false },
        data: { isRead: true },
      })

      return createSuccessResponse({ message: 'All notifications marked as read' })
    }

    // Mark a specific notification as read
    if (!id) {
      return createErrorResponse('INVALID_INPUT')
    }

    const notification = await db.notification.findUnique({ where: { id } })
    if (!notification) {
      return createErrorResponse('NOT_FOUND')
    }

    // Verify the notification belongs to the user
    if (notification.userId !== user.userId) {
      return createErrorResponse('INSUFFICIENT_PERMISSIONS')
    }

    const updated = await db.notification.update({
      where: { id },
      data: { isRead: true },
    })

    return createSuccessResponse(updated)
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_PERMISSIONS') {
      return createErrorResponse(error.message)
    }
    console.error('Mark notification error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    // Delete all notifications for this user
    const result = await db.notification.deleteMany({
      where: { userId: user.userId },
    })

    return createSuccessResponse({
      message: 'All notifications cleared',
      deletedCount: result.count,
    })
  } catch (error) {
    console.error('Clear notifications error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
