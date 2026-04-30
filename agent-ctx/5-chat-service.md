# Task 5 - WebSocket Chat Mini-Service (Agent: chat-service)

## Completed: 2025-04-29

## Summary
Created a Socket.IO WebSocket chat mini-service at `/home/z/my-project/mini-services/chat-service/` that enables real-time chat between entrepreneurs and consultants. The service runs on port 3003, authenticates via JWT tokens, manages rooms, handles real-time messaging with persistence, typing indicators, read receipts, and presence tracking.

## Changes Made

### 1. package.json (`mini-services/chat-service/package.json`)
- Name: `chat-service` v1.0.0
- Dev script: `bun --hot index.ts`
- Dependencies: `socket.io@^4.8.3`

### 2. index.ts (`mini-services/chat-service/index.ts`)
Full Socket.IO server implementation with:

#### Authentication
- Validates JWT token from handshake query (`token` param)
- Uses `/api/auth/me` endpoint to verify tokens (HTTP call to Next.js app)
- Auth failures still allow connection but mark socket as unauthenticated
- Emits `auth-result` event with success/failure status

#### Room Management
- `join-room` event: socket joins Socket.IO room by chatRoomId
- `leave-room` event: socket leaves room
- Tracks `userId -> Set<socketId>` mapping (multi-device support)
- Tracks `socketId -> Set<roomId>` mapping for cleanup
- Notifies rooms on join/leave via `user-joined-room` / `user-left-room`

#### Real-time Messaging
- `send-message` event: broadcasts `new-message` to room (except sender)
- Message format: `{ chatRoomId, senderId, senderName, content, createdAt }`
- Validates required fields and sender ID match
- Persists message via HTTP POST to `/api/chat/rooms/{roomId}/messages` with Bearer token
- Emits `message-saved` to sender with persisted message data
- Emits `message-error` on failure, `message-warning` if not authenticated

#### Typing Indicators
- `typing-start` → broadcasts `user-typing` to room (except sender)
- `typing-stop` → broadcasts `user-stopped-typing` to room (except sender)

#### Read Receipts
- `mark-read` → broadcasts `messages-read` to room with `{ chatRoomId, userId }`

#### Presence
- `user-online` event: stores user as online, broadcasts `presence-update`
- On disconnect: removes user from online set, broadcasts `presence-update` with `offline` status
- `presence-update` includes full `onlineUsers` array

#### Connection/Disconnection
- On connect: logs connection, attempts JWT auth from handshake query
- On disconnect: cleans up rooms and user mappings, notifies rooms, broadcasts offline status

#### Server Configuration
- Port: 3003
- Path: `/` (required by Caddy gateway)
- CORS: allow all origins
- Ping timeout: 60s, ping interval: 25s
- Graceful shutdown on SIGTERM/SIGINT

### 3. Service Status
- Installed dependencies via `bun install`
- Service running as PID with PPID 1 (properly daemonized)
- Verified Socket.IO polling endpoint responds correctly
- Lint passes (only pre-existing font warning)

## Key Design Decisions
1. **Token verification via API** - Instead of importing jsonwebtoken directly (which would add a dependency and duplicate the JWT secret), the service validates tokens by calling the Next.js `/api/auth/me` endpoint
2. **Message persistence via HTTP** - Since this is a separate bun project that can't import the shared Prisma client, messages are persisted by making HTTP POST requests to the Next.js API
3. **Multi-device support** - Uses `Map<userId, Set<socketId>>` to track multiple connections per user
4. **Non-blocking auth** - Unauthenticated users can connect but can't persist messages; real-time features still work for testing
