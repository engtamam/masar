// Chat Service - WebSocket real-time chat for Digital Incubator Platform
// Enables real-time communication between entrepreneurs and consultants
// Persists messages via HTTP POST to the Next.js API

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
// Start Server
// ============================================================================

httpServer.listen(PORT, () => {
  console.log(`[Chat Service] WebSocket server running on port ${PORT}`)
  console.log(`[Chat Service] JWT_SECRET: ${JWT_SECRET === 'default-jwt-secret-change-me' ? '(using default)' : '(custom)'}`)
  console.log(`[Chat Service] API Base: ${API_BASE}`)
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
