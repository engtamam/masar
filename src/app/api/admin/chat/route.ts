// GET /api/admin/chat - Get all chat rooms with messages (for monitoring)

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
    const roomId = url.searchParams.get('roomId')
    const skip = (page - 1) * limit

    // If a specific room is requested, return its messages
    if (roomId) {
      const room = await db.chatRoom.findUnique({
        where: { id: roomId },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, role: true, avatarUrl: true },
              },
            },
          },
          messages: {
            include: {
              sender: {
                select: { id: true, name: true, role: true, avatarUrl: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      })

      if (!room) {
        return createErrorResponse('NOT_FOUND')
      }

      return createSuccessResponse(room)
    }

    // List all chat rooms with recent messages
    const [rooms, total] = await Promise.all([
      db.chatRoom.findMany({
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, role: true, avatarUrl: true },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: {
              sender: {
                select: { id: true, name: true, role: true },
              },
            },
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      db.chatRoom.count(),
    ])

    // Add unread counts per room
    const roomsWithStats = rooms.map((room) => ({
      ...room,
      totalMessages: room._count.messages,
    }))

    return createSuccessResponse({
      rooms: roomsWithStats,
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
    console.error('Get chat rooms error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
