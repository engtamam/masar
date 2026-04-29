// GET /api/chat/rooms - List user's chat rooms
// POST /api/chat/rooms - Create chat room

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, createSuccessResponse, createErrorResponse } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    // Get user's chat rooms
    const chatRooms = await db.chatRoom.findMany({
      where: {
        members: {
          some: { userId: user.userId },
        },
        isActive: true,
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, avatarUrl: true, role: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Get unread message counts for each room
    const roomsWithUnread = await Promise.all(
      chatRooms.map(async (room) => {
        const unreadCount = await db.chatMessage.count({
          where: {
            chatRoomId: room.id,
            senderId: { not: user.userId },
            isRead: false,
          },
        })

        return {
          ...room,
          unreadCount,
        }
      })
    )

    return createSuccessResponse(roomsWithUnread)
  } catch (error) {
    console.error('Get chat rooms error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const body = await request.json()
    const { participantIds, name, type } = body

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return createErrorResponse('INVALID_INPUT')
    }

    // For DIRECT chats, check if a room already exists between the users
    if (type === 'DIRECT' || !type) {
      const allParticipants = [user.userId, ...participantIds]

      // Find existing direct rooms
      const existingRooms = await db.chatRoom.findMany({
        where: {
          type: 'DIRECT',
          isActive: true,
          members: {
            every: {
              userId: { in: allParticipants },
            },
          },
        },
        include: {
          members: true,
        },
      })

      // Check if any existing room has exactly the same members
      const exactMatch = existingRooms.find(
        (room) => room.members.length === allParticipants.length
      )

      if (exactMatch) {
        return createSuccessResponse(exactMatch)
      }
    }

    // Create new chat room
    const allMemberIds = [user.userId, ...participantIds]
    const chatRoom = await db.chatRoom.create({
      data: {
        name: name || null,
        type: type || 'DIRECT',
        members: {
          create: allMemberIds.map((userId: string) => ({
            userId,
            role: userId === user.userId ? 'admin' : 'member',
          })),
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, avatarUrl: true, role: true },
            },
          },
        },
      },
    })

    return createSuccessResponse(chatRoom, 201)
  } catch (error) {
    console.error('Create chat room error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
