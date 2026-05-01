// Chat Service - WebSocket real-time chat + WebRTC signaling for Digital Incubator Platform
// Enables real-time communication between entrepreneurs and consultants
// Persists messages via HTTP POST to the Next.js API
// Handles WebRTC signaling for local video calls with time enforcement

import { createServer } from 'http'
import { Server, Socket } from 'socket.io'

// ============================================================================
// Configuration
// ============================================================================

const PORT = 3003
const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret-change-me'
const API_BASE = 'http://localhost:3000'

// ============================================================================
// Types
// ============================================================================

interface DecodedToken {
  userId: string
  email: string
  role: string
}

interface AuthenticatedSocket extends Socket {
  userId?: string
  userName?: string
  userRole?: string
  isAuthenticated: boolean
  token?: string
}

interface SendMessagePayload {
  chatRoomId: string
  senderId: string
  senderName: string
  content: string
}

interface TypingPayload {
  chatRoomId: string
  userId: string
  userName: string
}

interface MarkReadPayload {
  chatRoomId: string
  userId: string
}

// WebRTC Signaling types
interface OfferPayload {
  roomId: string
  sdp: RTCSessionDescriptionInit
  fromUserId: string
  fromUserName: string
}

interface AnswerPayload {
  roomId: string
  sdp: RTCSessionDescriptionInit
  fromUserId: string
  toUserId: string
}

interface IceCandidatePayload {
  roomId: string
  candidate: RTCIceCandidateInit
  fromUserId: string
}

interface MeetingJoinPayload {
  roomId: string
  userId: string
  userName: string
}

interface MeetingLeavePayload {
  roomId: string
  userId: string
}

interface CallEndPayload {
  roomId: string
  userId: string
}

interface ScreenSharePayload {
  roomId: string
  userId: string
}

// ============================================================================
// State Management
// ============================================================================

// userId -> Set of socketIds (a user can have multiple tabs/devices)
const userSockets = new Map<string, Set<string>>()

// socketId -> Set of roomIds the socket has joined
const socketRooms = new Map<string, Set<string>>()

// Set of currently online user IDs
const onlineUsers = new Set<string>()

// userId -> userName mapping
const userNames = new Map<string, string>()

// Meeting rooms: roomId -> { participantIds, bookingEndTime }
interface MeetingRoom {
  participantIds: Set<string>
  bookingDate: string
  startTime: string
  endTime: string
  timeUpTimer?: ReturnType<typeof setTimeout>
}
const meetingRooms = new Map<string, MeetingRoom>()

// ============================================================================
// JWT Verification (lightweight, no external deps needed beyond jsonwebtoken)
// ============================================================================

/**
 * Simple JWT decode without external library for the handshake.
 * We verify the signature using a minimal approach since we can't import
 * jsonwebtoken in a standalone bun project without installing it.
 * Instead, we'll validate the token by calling the Next.js /api/auth/me endpoint.
 */
async function verifyToken(token: string): Promise<DecodedToken | null> {
  try {
    // Validate token by calling the Next.js auth endpoint
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      return null
    }

    const result = await response.json()
    if (result.success && result.data) {
      return {
        userId: result.data.id,
        email: result.data.email,
        role: result.data.role,
      }
    }
    return null
  } catch (error) {
    console.error('Token verification error:', error)
    return null
  }
}

// ============================================================================
// Message Persistence
// ============================================================================

/**
 * Persist a message to the database via the Next.js API
 */
async function persistMessage(
  roomId: string,
  content: string,
  token: string
): Promise<{ success: boolean; message?: Record<string, unknown> }> {
  try {
    const response = await fetch(`${API_BASE}/api/chat/rooms/${roomId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Failed to persist message to room ${roomId}: ${errorText}`)
      return { success: false }
    }

    const result = await response.json()
    return { success: true, message: result.data }
  } catch (error) {
    console.error('Persist message error:', error)
    return { success: false }
  }
}

// ============================================================================
// Meeting Time Enforcement
// ============================================================================

function parseDateTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes] = timeStr.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes, 0, 0)
}

/**
 * Check if the current time is within the meeting window
 * Returns: { allowed: boolean, reason?: string }
 */
function checkMeetingTimeAccess(
  dateStr: string,
  startTimeStr: string,
  endTimeStr: string
): { allowed: boolean; reason?: string; status: string } {
  const now = new Date()
  const meetingStart = parseDateTime(dateStr, startTimeStr)
  const meetingEnd = parseDateTime(dateStr, endTimeStr)
  const earlyJoinTime = new Date(meetingStart.getTime() - 5 * 60 * 1000) // 5 minutes early

  if (now < earlyJoinTime) {
    return { allowed: false, reason: 'Meeting has not opened yet', status: 'too_early' }
  }

  if (now >= earlyJoinTime && now < meetingStart) {
    return { allowed: true, status: 'waiting_room' }
  }

  if (now >= meetingStart && now < meetingEnd) {
    return { allowed: true, status: 'in_progress' }
  }

  return { allowed: false, reason: 'Meeting time has expired', status: 'time_up' }
}

/**
 * Set up an automatic timer to end the meeting when time expires
 */
function scheduleMeetingEnd(roomId: string): void {
  const room = meetingRooms.get(roomId)
  if (!room) return

  // Clear any existing timer
  if (room.timeUpTimer) {
    clearTimeout(room.timeUpTimer)
  }

  const meetingEnd = parseDateTime(room.bookingDate, room.endTime)
  const now = new Date()
  const msUntilEnd = meetingEnd.getTime() - now.getTime()

  if (msUntilEnd <= 0) {
    // Meeting time has already expired
    endMeetingRoom(roomId, 'time_up')
    return
  }

  // Set timer to end the meeting
  room.timeUpTimer = setTimeout(() => {
    endMeetingRoom(roomId, 'time_up')
  }, msUntilEnd)

  console.log(`[Chat Service] Meeting ${roomId} will end in ${Math.floor(msUntilEnd / 1000)} seconds`)
}

/**
 * End a meeting room and notify all participants
 */
function endMeetingRoom(roomId: string, reason: string): void {
  const room = meetingRooms.get(roomId)
  if (!room) return

  // Notify all participants
  io.to(`meeting-${roomId}`).emit('meeting-time-up', {
    roomId,
    reason,
    timestamp: new Date().toISOString(),
  })

  // Clean up
  if (room.timeUpTimer) {
    clearTimeout(room.timeUpTimer)
  }
  meetingRooms.delete(roomId)

  console.log(`[Chat Service] Meeting room ${roomId} ended (reason: ${reason})`)
}

// ============================================================================
// Socket.IO Server Setup
// ============================================================================

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ============================================================================
// Helper Functions
// ============================================================================

function removeSocketFromAllRooms(socket: AuthenticatedSocket) {
  const rooms = socketRooms.get(socket.id)
  if (rooms) {
    rooms.forEach((roomId) => {
      socket.leave(roomId)
    })
    socketRooms.delete(socket.id)
  }
}

function removeSocketFromUserMapping(socket: AuthenticatedSocket) {
  if (socket.userId) {
    const sockets = userSockets.get(socket.userId)
    if (sockets) {
      sockets.delete(socket.id)
      if (sockets.size === 0) {
        userSockets.delete(socket.userId)
        onlineUsers.delete(socket.userId)
        userNames.delete(socket.userId)

        // Broadcast presence update - user went offline
        io.emit('presence-update', {
          userId: socket.userId,
          status: 'offline',
          onlineUsers: Array.from(onlineUsers),
        })
      }
    }
  }
}

// ============================================================================
// Connection Handler
// ============================================================================

io.on('connection', (socket: AuthenticatedSocket) => {
  socket.isAuthenticated = false
  console.log(`[Chat Service] Socket connected: ${socket.id}`)

  // Extract token from handshake query
  const token = socket.handshake.query.token as string | undefined
  const userName = socket.handshake.query.userName as string | undefined

  // Attempt authentication
  if (token) {
    socket.token = token
    verifyToken(token).then((decoded) => {
      if (decoded) {
        socket.userId = decoded.userId
        socket.userName = userName || decoded.email
        socket.userRole = decoded.role
        socket.isAuthenticated = true

        // Track user -> socket mapping
        if (!userSockets.has(decoded.userId)) {
          userSockets.set(decoded.userId, new Set())
        }
        userSockets.get(decoded.userId)!.add(socket.id)

        // Track online status
        onlineUsers.add(decoded.userId)
        userNames.set(decoded.userId, socket.userName || decoded.email)

        console.log(
          `[Chat Service] Socket ${socket.id} authenticated as user ${decoded.userId} (${socket.userName})`
        )

        // Send authentication confirmation to the client
        socket.emit('auth-result', {
          success: true,
          userId: decoded.userId,
          role: decoded.role,
        })

        // Broadcast presence update - user came online
        io.emit('presence-update', {
          userId: decoded.userId,
          userName: socket.userName,
          status: 'online',
          onlineUsers: Array.from(onlineUsers),
        })
      } else {
        console.log(`[Chat Service] Socket ${socket.id} authentication failed`)
        socket.isAuthenticated = false
        socket.emit('auth-result', {
          success: false,
          message: 'Authentication failed',
        })
      }
    })
  } else {
    console.log(`[Chat Service] Socket ${socket.id} connected without token (unauthenticated)`)
    socket.emit('auth-result', {
      success: false,
      message: 'No token provided',
    })
  }

  // ========================================================================
  // Room Management
  // ========================================================================

  socket.on('join-room', (data: { chatRoomId: string }) => {
    const { chatRoomId } = data
    socket.join(chatRoomId)

    // Track socket -> rooms mapping
    if (!socketRooms.has(socket.id)) {
      socketRooms.set(socket.id, new Set())
    }
    socketRooms.get(socket.id)!.add(chatRoomId)

    console.log(
      `[Chat Service] User ${socket.userName || socket.id} joined room ${chatRoomId}`
    )

    // Notify room that user joined
    socket.to(chatRoomId).emit('user-joined-room', {
      chatRoomId,
      userId: socket.userId,
      userName: socket.userName,
    })
  })

  socket.on('leave-room', (data: { chatRoomId: string }) => {
    const { chatRoomId } = data
    socket.leave(chatRoomId)

    // Remove from tracking
    const rooms = socketRooms.get(socket.id)
    if (rooms) {
      rooms.delete(chatRoomId)
    }

    console.log(
      `[Chat Service] User ${socket.userName || socket.id} left room ${chatRoomId}`
    )

    // Notify room that user left
    socket.to(chatRoomId).emit('user-left-room', {
      chatRoomId,
      userId: socket.userId,
      userName: socket.userName,
    })
  })

  // ========================================================================
  // Real-time Messaging
  // ========================================================================

  socket.on('send-message', async (data: SendMessagePayload) => {
    const { chatRoomId, senderId, senderName, content } = data

    // Validate required fields
    if (!chatRoomId || !content || typeof content !== 'string' || content.trim().length === 0) {
      socket.emit('message-error', {
        chatRoomId,
        error: 'Invalid message data',
      })
      return
    }

    // Verify sender matches authenticated user (if authenticated)
    if (socket.isAuthenticated && socket.userId && senderId !== socket.userId) {
      socket.emit('message-error', {
        chatRoomId,
        error: 'Sender ID mismatch',
      })
      return
    }

    const createdAt = new Date().toISOString()

    // Broadcast to room (except sender) immediately for real-time feel
    socket.to(chatRoomId).emit('new-message', {
      chatRoomId,
      senderId,
      senderName,
      content: content.trim(),
      createdAt,
    })

    // Persist message to database via HTTP API
    if (socket.token) {
      const result = await persistMessage(chatRoomId, content.trim(), socket.token)
      if (result.success && result.message) {
        // Send the persisted message (with DB-generated ID) back to the sender
        socket.emit('message-saved', {
          chatRoomId,
          tempId: createdAt, // Use timestamp as temp ID reference
          message: result.message,
        })
      } else {
        socket.emit('message-error', {
          chatRoomId,
          error: 'Failed to persist message',
          content,
          createdAt,
        })
      }
    } else {
      // No token - message was broadcast but not persisted
      socket.emit('message-warning', {
        chatRoomId,
        warning: 'Message delivered but not persisted (not authenticated)',
      })
    }

    console.log(
      `[Chat Service] Message in room ${chatRoomId} from ${senderName}: ${content.substring(0, 50)}...`
    )
  })

  // ========================================================================
  // Typing Indicators
  // ========================================================================

  socket.on('typing-start', (data: TypingPayload) => {
    const { chatRoomId, userId, userName } = data
    socket.to(chatRoomId).emit('user-typing', {
      chatRoomId,
      userId,
      userName,
    })
  })

  socket.on('typing-stop', (data: TypingPayload) => {
    const { chatRoomId, userId, userName } = data
    socket.to(chatRoomId).emit('user-stopped-typing', {
      chatRoomId,
      userId,
      userName,
    })
  })

  // ========================================================================
  // Read Receipts
  // ========================================================================

  socket.on('mark-read', (data: MarkReadPayload) => {
    const { chatRoomId, userId } = data

    // Broadcast to room that this user has read messages
    socket.to(chatRoomId).emit('messages-read', {
      chatRoomId,
      userId,
    })

    console.log(`[Chat Service] User ${userId} marked messages as read in room ${chatRoomId}`)
  })

  // ========================================================================
  // Presence / Online Status
  // ========================================================================

  socket.on('user-online', (data: { userId: string; userName: string }) => {
    const { userId, userName } = data

    onlineUsers.add(userId)
    userNames.set(userId, userName)

    // Broadcast presence update
    io.emit('presence-update', {
      userId,
      userName,
      status: 'online',
      onlineUsers: Array.from(onlineUsers),
    })

    console.log(`[Chat Service] User ${userName} (${userId}) is online`)
  })

  // ========================================================================
  // WebRTC Signaling
  // ========================================================================

  // Join a meeting room
  socket.on('meeting-join', (data: MeetingJoinPayload) => {
    const { roomId, userId, userName } = data

    if (!socket.isAuthenticated) {
      socket.emit('meeting-error', { roomId, error: 'Not authenticated' })
      return
    }

    const meetingSocketRoom = `meeting-${roomId}`
    socket.join(meetingSocketRoom)

    // Track in socket rooms
    if (!socketRooms.has(socket.id)) {
      socketRooms.set(socket.id, new Set())
    }
    socketRooms.get(socket.id)!.add(meetingSocketRoom)

    // Add participant to meeting room
    if (!meetingRooms.has(roomId)) {
      // This shouldn't happen if meeting was created via API, but handle gracefully
      console.log(`[Chat Service] Meeting room ${roomId} not found, creating without time enforcement`)
      meetingRooms.set(roomId, {
        participantIds: new Set(),
        bookingDate: '',
        startTime: '',
        endTime: '',
      })
    }

    const room = meetingRooms.get(roomId)!
    room.participantIds.add(userId)

    console.log(`[Chat Service] User ${userName} (${userId}) joined meeting ${roomId}`)

    // Notify others in the meeting room
    socket.to(meetingSocketRoom).emit('meeting-participant-joined', {
      roomId,
      userId,
      userName,
    })
  })

  // Leave a meeting room
  socket.on('meeting-leave', (data: MeetingLeavePayload) => {
    const { roomId, userId } = data

    const meetingSocketRoom = `meeting-${roomId}`
    socket.leave(meetingSocketRoom)

    // Remove from tracking
    const rooms = socketRooms.get(socket.id)
    if (rooms) {
      rooms.delete(meetingSocketRoom)
    }

    // Remove participant from meeting room
    const room = meetingRooms.get(roomId)
    if (room) {
      room.participantIds.delete(userId)

      // Notify others
      socket.to(meetingSocketRoom).emit('meeting-participant-left', {
        roomId,
        userId,
      })

      // If no participants left, clean up the room
      if (room.participantIds.size === 0) {
        if (room.timeUpTimer) {
          clearTimeout(room.timeUpTimer)
        }
        meetingRooms.delete(roomId)
        console.log(`[Chat Service] Meeting room ${roomId} emptied and cleaned up`)
      }
    }

    console.log(`[Chat Service] User ${userId} left meeting ${roomId}`)
  })

  // WebRTC Offer
  socket.on('webrtc-offer', (data: OfferPayload) => {
    if (!socket.isAuthenticated) return

    console.log(`[Chat Service] WebRTC offer from ${data.fromUserId} in room ${data.roomId}`)

    // Forward offer to all other participants in the meeting room
    socket.to(`meeting-${data.roomId}`).emit('webrtc-offer', {
      sdp: data.sdp,
      fromUserId: data.fromUserId,
      fromUserName: data.fromUserName,
    })
  })

  // WebRTC Answer
  socket.on('webrtc-answer', (data: AnswerPayload) => {
    if (!socket.isAuthenticated) return

    console.log(`[Chat Service] WebRTC answer from ${data.fromUserId} to ${data.toUserId} in room ${data.roomId}`)

    // Forward answer to the specific user
    // Find the target user's socket
    const targetSockets = userSockets.get(data.toUserId)
    if (targetSockets) {
      targetSockets.forEach(socketId => {
        io.to(socketId).emit('webrtc-answer', {
          sdp: data.sdp,
          fromUserId: data.fromUserId,
        })
      })
    }
  })

  // ICE Candidate
  socket.on('webrtc-ice-candidate', (data: IceCandidatePayload) => {
    if (!socket.isAuthenticated) return

    // Forward ICE candidate to all other participants in the meeting room
    socket.to(`meeting-${data.roomId}`).emit('webrtc-ice-candidate', {
      candidate: data.candidate,
      fromUserId: data.fromUserId,
    })
  })

  // Call End
  socket.on('webrtc-call-end', (data: CallEndPayload) => {
    if (!socket.isAuthenticated) return

    console.log(`[Chat Service] User ${data.userId} ended call in room ${data.roomId}`)

    // Notify others in the meeting room
    socket.to(`meeting-${data.roomId}`).emit('webrtc-call-ended', {
      userId: data.userId,
    })
  })

  // Screen Share Start
  socket.on('screen-share-start', (data: ScreenSharePayload) => {
    if (!socket.isAuthenticated) return

    console.log(`[Chat Service] User ${data.userId} started screen share in room ${data.roomId}`)

    socket.to(`meeting-${data.roomId}`).emit('screen-share-started', {
      userId: data.userId,
    })
  })

  // Screen Share Stop
  socket.on('screen-share-stop', (data: ScreenSharePayload) => {
    if (!socket.isAuthenticated) return

    console.log(`[Chat Service] User ${data.userId} stopped screen share in room ${data.roomId}`)

    socket.to(`meeting-${data.roomId}`).emit('screen-share-stopped', {
      userId: data.userId,
    })
  })

  // ========================================================================
  // Disconnection
  // ========================================================================

  socket.on('disconnect', (reason) => {
    console.log(
      `[Chat Service] Socket ${socket.id} disconnected (reason: ${reason})`
    )

    // Notify all rooms this socket was in about the disconnect
    const rooms = socketRooms.get(socket.id)
    if (rooms) {
      rooms.forEach((roomId) => {
        socket.to(roomId).emit('user-left-room', {
          chatRoomId: roomId,
          userId: socket.userId,
          userName: socket.userName,
        })

        // If it's a meeting room, also handle meeting leave
        if (roomId.startsWith('meeting-')) {
          const meetingRoomId = roomId.replace('meeting-', '')
          const room = meetingRooms.get(meetingRoomId)
          if (room && socket.userId) {
            room.participantIds.delete(socket.userId)
            socket.to(roomId).emit('meeting-participant-left', {
              roomId: meetingRoomId,
              userId: socket.userId,
            })
          }
        }
      })
    }

    // Clean up socket -> rooms mapping
    removeSocketFromAllRooms(socket)

    // Clean up user -> socket mapping and presence
    removeSocketFromUserMapping(socket)
  })

  // ========================================================================
  // Error Handling
  // ========================================================================

  socket.on('error', (error) => {
    console.error(`[Chat Service] Socket error (${socket.id}):`, error)
  })
})

// ============================================================================
// API: Register Meeting Room (called from Next.js API when booking is created)
// ============================================================================

/**
 * Register a meeting room with time constraints
 * This is called from the booking API to set up the meeting room
 */
export function registerMeetingRoom(
  roomId: string,
  bookingDate: string,
  startTime: string,
  endTime: string
): void {
  if (!meetingRooms.has(roomId)) {
    meetingRooms.set(roomId, {
      participantIds: new Set(),
      bookingDate,
      startTime,
      endTime,
    })

    // Schedule automatic meeting end
    scheduleMeetingEnd(roomId)

    console.log(`[Chat Service] Meeting room ${roomId} registered for ${bookingDate} ${startTime}-${endTime}`)
  }
}

// ============================================================================
// Start Server
// ============================================================================

httpServer.listen(PORT, () => {
  console.log(`[Chat Service] WebSocket server running on port ${PORT}`)
  console.log(`[Chat Service] JWT_SECRET: ${JWT_SECRET === 'default-jwt-secret-change-me' ? '(using default)' : '(custom)'}`)
  console.log(`[Chat Service] API Base: ${API_BASE}`)
  console.log(`[Chat Service] WebRTC signaling enabled`)
})

// ============================================================================
// Graceful Shutdown
// ============================================================================

function gracefulShutdown(signal: string) {
  console.log(`[Chat Service] Received ${signal}, shutting down...`)

  // Notify all clients that the server is shutting down
  io.emit('server-shutdown', {
    message: 'Server is shutting down',
    timestamp: new Date().toISOString(),
  })

  // Clean up all meeting room timers
  meetingRooms.forEach((room, roomId) => {
    if (room.timeUpTimer) {
      clearTimeout(room.timeUpTimer)
    }
  })
  meetingRooms.clear()

  // Close all connections
  io.disconnectSockets()

  httpServer.close(() => {
    console.log('[Chat Service] Server closed')
    process.exit(0)
  })

  // Force close after 5 seconds
  setTimeout(() => {
    console.error('[Chat Service] Forced shutdown after timeout')
    process.exit(1)
  }, 5000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
