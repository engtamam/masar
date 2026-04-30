// GET /api/chat/rooms/[id]/messages - Get messages for a room (paginated)
// POST /api/chat/rooms/[id]/messages - Send message

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, createSuccessResponse, createErrorResponse } from '@/lib/middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return createErrorResponse('AUTH_REQUIRED')
    }

    const { id } = await params
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const before = url.searchParams.get('before') // cursor for loading older messages
    const skip = (page - 1) * limit

    // Verify user is a member of this chat room
    const membership = await db.chatRoomMember.findFirst({
      where: { chatRoomId: id, userId: user.userId },
    })

    if (!membership) {
      return createErrorResponse('INSUFFICIENT_PERMISSIONS')
    }

    // Build query
    let where: Record<string, unknown> = { chatRoomId: id }
    if (before) {
      where.createdAt = { lt: new Date(before) }
    }

    const [messages, total] = await Promise.all([
      db.chatMessage.findMany({
        where,
        include: {
          sender: {
            select: { id: true, name: true, avatarUrl: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.chatMessage.count({ where }),
    ])

    // Mark messages from other users as read
    await db.chatMessage.updateMany({
      where: {
        chatRoomId: id,
        senderId: { not: user.userId },
        isRead: false,
      },
      data: { isRead: true },
    })

    return createSuccessResponse({
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        page,
        limit,
        total,
        hasMore: total > page * limit,
      },
    })
  } catch (error) {
    console.error('Get messages error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function POST(
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
    const { content } = body

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return createErrorResponse('INVALID_INPUT')
    }

    // Verify user is a member of this chat room
    const membership = await db.chatRoomMember.findFirst({
      where: { chatRoomId: id, userId: user.userId },
    })

    if (!membership) {
      return createErrorResponse('INSUFFICIENT_PERMISSIONS')
    }

    // Create message
    const message = await db.chatMessage.create({
      data: {
        chatRoomId: id,
        senderId: user.userId,
        content: content.trim(),
      },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true, role: true },
        },
      },
    })

    // Update chat room's updatedAt
    await db.chatRoom.update({
      where: { id },
      data: { updatedAt: new Date() },
    })

    // Notify other room members
    const otherMembers = await db.chatRoomMember.findMany({
      where: {
        chatRoomId: id,
        userId: { not: user.userId },
      },
    })

    for (const member of otherMembers) {
      await db.notification.create({
        data: {
          userId: member.userId,
          title: 'New Message',
          message: `${user.name} sent a message in the chat`,
          type: 'info',
          link: `/chat/${id}`,
        },
      })
    }

    return createSuccessResponse(message, 201)
  } catch (error) {
    console.error('Send message error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
