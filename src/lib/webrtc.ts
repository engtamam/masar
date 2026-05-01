// WebRTC Helper Library - Manages peer-to-peer video/audio connections
// Uses Socket.IO for signaling and Google STUN for NAT traversal
// All communication stays local - no external video services needed

import { io, Socket } from 'socket.io-client'

// ============================================================================
// Configuration
// ============================================================================

const CHAT_SERVICE_URL = process.env.NEXT_PUBLIC_CHAT_URL || 'http://localhost:3003'

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

// ============================================================================
// Types
// ============================================================================

export type CallStatus = 'idle' | 'connecting' | 'ringing' | 'connected' | 'ended' | 'failed'

export interface WebRTCCallbacks {
  onLocalStream: (stream: MediaStream) => void
  onRemoteStream: (stream: MediaStream) => void
  onStatusChange: (status: CallStatus) => void
  onTimeUp: () => void
  onError: (error: string) => void
  onParticipantJoined: (userId: string, userName: string) => void
  onParticipantLeft: (userId: string) => void
}

export interface WebRTCManager {
  startCall: (roomId: string, userId: string, userName: string, token: string) => Promise<void>
  joinCall: (roomId: string, userId: string, userName: string, token: string) => Promise<void>
  endCall: () => void
  toggleAudio: () => boolean
  toggleVideo: () => boolean
  startScreenShare: () => Promise<boolean>
  stopScreenShare: () => void
  getStatus: () => CallStatus
  getLocalStream: () => MediaStream | null
  getRemoteStream: () => MediaStream | null
  getCallDuration: () => number
  destroy: () => void
}

// ============================================================================
// WebRTC Manager Factory
// ============================================================================

export function createWebRTCManager(callbacks: WebRTCCallbacks): WebRTCManager {
  let peerConnection: RTCPeerConnection | null = null
  let localStream: MediaStream | null = null
  let remoteStream: MediaStream | null = null
  let screenStream: MediaStream | null = null
  let socket: Socket | null = null
  let status: CallStatus = 'idle'
  let callStartTime: number | null = null
  let currentRoomId: string | null = null
  let currentUserId: string | null = null
  let timeUpTimer: ReturnType<typeof setTimeout> | null = null
  let isAudioEnabled = true
  let isVideoEnabled = true
  let isScreenSharing = false

  // ========================================================================
  // Internal Helpers
  // ========================================================================

  function setStatus(newStatus: CallStatus) {
    status = newStatus
    callbacks.onStatusChange(newStatus)
  }

  function cleanup() {
    if (timeUpTimer) {
      clearTimeout(timeUpTimer)
      timeUpTimer = null
    }

    if (peerConnection) {
      peerConnection.close()
      peerConnection = null
    }

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
      localStream = null
    }

    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop())
      screenStream = null
    }

    remoteStream = null
    isScreenSharing = false
    isAudioEnabled = true
    isVideoEnabled = true
    callStartTime = null
  }

  function setupPeerConnection() {
    peerConnection = new RTCPeerConnection(ICE_SERVERS)

    // Add local tracks to the peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection!.addTrack(track, localStream!)
      })
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      remoteStream = event.streams[0]
      callbacks.onRemoteStream(remoteStream)
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc-ice-candidate', {
          roomId: currentRoomId,
          candidate: event.candidate.toJSON(),
          fromUserId: currentUserId,
        })
      }
    }

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection?.connectionState
      switch (state) {
        case 'connected':
          setStatus('connected')
          callStartTime = Date.now()
          break
        case 'disconnected':
        case 'failed':
          setStatus('failed')
          callbacks.onError('فقدان الاتصال')
          break
        case 'closed':
          setStatus('ended')
          break
      }
    }

    peerConnection.oniceconnectionstatechange = () => {
      const state = peerConnection?.iceConnectionState
      if (state === 'failed') {
        setStatus('failed')
        callbacks.onError('فشل الاتصال')
      }
    }
  }

  function setupSocketListeners() {
    if (!socket) return

    // Handle incoming call offer
    socket.on('webrtc-offer', async (data: { sdp: RTCSessionDescriptionInit; fromUserId: string; fromUserName: string }) => {
      try {
        if (!peerConnection) {
          setupPeerConnection()
          // Get local media if not already
          if (!localStream) {
            localStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true,
            })
            callbacks.onLocalStream(localStream)
            // Re-add tracks to the new peer connection
            localStream.getTracks().forEach(track => {
              peerConnection!.addTrack(track, localStream!)
            })
          }
        }

        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp))
        const answer = await peerConnection.createAnswer()
        await peerConnection.setLocalDescription(answer)

        socket.emit('webrtc-answer', {
          roomId: currentRoomId,
          sdp: peerConnection.localDescription?.toJSON(),
          fromUserId: currentUserId,
          toUserId: data.fromUserId,
        })

        callbacks.onParticipantJoined(data.fromUserId, data.fromUserName)
        setStatus('connecting')
      } catch (error) {
        console.error('Error handling offer:', error)
        callbacks.onError('فشل في قبول المكالمة')
      }
    })

    // Handle call answer
    socket.on('webrtc-answer', async (data: { sdp: RTCSessionDescriptionInit; fromUserId: string }) => {
      try {
        if (peerConnection) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp))
          setStatus('connecting')
        }
      } catch (error) {
        console.error('Error handling answer:', error)
        callbacks.onError('فشل في اتصال المكالمة')
      }
    })

    // Handle ICE candidates from remote
    socket.on('webrtc-ice-candidate', async (data: { candidate: RTCIceCandidateInit; fromUserId: string }) => {
      try {
        if (peerConnection) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
        }
      } catch (error) {
        console.error('Error adding ICE candidate:', error)
      }
    })

    // Handle call end from remote
    socket.on('webrtc-call-ended', (data: { userId: string }) => {
      cleanup()
      setStatus('ended')
      callbacks.onParticipantLeft(data.userId)
    })

    // Handle time-up from server
    socket.on('meeting-time-up', () => {
      cleanup()
      setStatus('ended')
      callbacks.onTimeUp()
    })

    // Handle participant joining the meeting room
    socket.on('meeting-participant-joined', (data: { userId: string; userName: string }) => {
      callbacks.onParticipantJoined(data.userId, data.userName)
    })

    // Handle participant leaving
    socket.on('meeting-participant-left', (data: { userId: string }) => {
      callbacks.onParticipantLeft(data.userId)
    })

    // Handle screen share notifications
    socket.on('screen-share-started', (data: { userId: string }) => {
      // Remote participant started screen sharing
    })

    socket.on('screen-share-stopped', (data: { userId: string }) => {
      // Remote participant stopped screen sharing
    })
  }

  // ========================================================================
  // Public Methods
  // ========================================================================

  async function startCall(roomId: string, userId: string, userName: string, token: string): Promise<void> {
    try {
      currentRoomId = roomId
      currentUserId = userId
      setStatus('connecting')

      // Get local media stream
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      callbacks.onLocalStream(localStream)

      // Connect to signaling server
      socket = io(CHAT_SERVICE_URL, {
        query: { token, userName },
        transports: ['websocket'],
      })

      setupSocketListeners()

      // Join the meeting room
      socket.emit('meeting-join', { roomId, userId, userName })

      // Create peer connection
      setupPeerConnection()

      // Create and send offer
      const offer = await peerConnection!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      })
      await peerConnection!.setLocalDescription(offer)

      socket.emit('webrtc-offer', {
        roomId,
        sdp: peerConnection!.localDescription?.toJSON(),
        fromUserId: userId,
        fromUserName: userName,
      })
    } catch (error) {
      console.error('Error starting call:', error)
      setStatus('failed')
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        callbacks.onError('يرجى السماح بالوصول للكاميرا والمايكروفون')
      } else {
        callbacks.onError('فشل في بدء المكالمة')
      }
    }
  }

  async function joinCall(roomId: string, userId: string, userName: string, token: string): Promise<void> {
    try {
      currentRoomId = roomId
      currentUserId = userId
      setStatus('connecting')

      // Get local media stream
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      callbacks.onLocalStream(localStream)

      // Connect to signaling server
      socket = io(CHAT_SERVICE_URL, {
        query: { token, userName },
        transports: ['websocket'],
      })

      setupSocketListeners()

      // Join the meeting room - server will notify others
      socket.emit('meeting-join', { roomId, userId, userName })

      // Create peer connection (will wait for offer from the other participant)
      setupPeerConnection()
    } catch (error) {
      console.error('Error joining call:', error)
      setStatus('failed')
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        callbacks.onError('يرجى السماح بالوصول للكاميرا والمايكروفون')
      } else {
        callbacks.onError('فشل في الانضمام للمكالمة')
      }
    }
  }

  function endCall(): void {
    if (socket && currentRoomId && currentUserId) {
      socket.emit('webrtc-call-end', {
        roomId: currentRoomId,
        userId: currentUserId,
      })
      socket.emit('meeting-leave', {
        roomId: currentRoomId,
        userId: currentUserId,
      })
    }
    cleanup()
    setStatus('ended')
  }

  function toggleAudio(): boolean {
    if (localStream) {
      isAudioEnabled = !isAudioEnabled
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isAudioEnabled
      })
    }
    return isAudioEnabled
  }

  function toggleVideo(): boolean {
    if (localStream) {
      isVideoEnabled = !isVideoEnabled
      localStream.getVideoTracks().forEach(track => {
        track.enabled = isVideoEnabled
      })
    }
    return isVideoEnabled
  }

  async function startScreenShare(): Promise<boolean> {
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      })

      // Replace video track with screen share track
      if (peerConnection && screenStream) {
        const screenTrack = screenStream.getVideoTracks()[0]
        const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video')
        if (sender) {
          await sender.replaceTrack(screenTrack)
        }
      }

      // Listen for screen share stop (user clicks browser's "Stop sharing" button)
      screenStream.getVideoTracks()[0].onended = () => {
        stopScreenShare()
      }

      isScreenSharing = true

      if (socket && currentRoomId) {
        socket.emit('screen-share-start', { roomId: currentRoomId, userId: currentUserId })
      }

      return true
    } catch (error) {
      console.error('Error starting screen share:', error)
      return false
    }
  }

  function stopScreenShare(): void {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop())
      screenStream = null
    }

    // Switch back to camera track
    if (peerConnection && localStream) {
      const cameraTrack = localStream.getVideoTracks()[0]
      const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video')
      if (sender && cameraTrack) {
        sender.replaceTrack(cameraTrack)
      }
    }

    isScreenSharing = false

    if (socket && currentRoomId) {
      socket.emit('screen-share-stop', { roomId: currentRoomId, userId: currentUserId })
    }
  }

  function getStatus(): CallStatus {
    return status
  }

  function getLocalStream(): MediaStream | null {
    return localStream
  }

  function getRemoteStream(): MediaStream | null {
    return remoteStream
  }

  function getCallDuration(): number {
    if (!callStartTime) return 0
    return Math.floor((Date.now() - callStartTime) / 1000)
  }

  function destroy(): void {
    cleanup()
    if (socket) {
      socket.disconnect()
      socket = null
    }
    setStatus('idle')
  }

  return {
    startCall,
    joinCall,
    endCall,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    getStatus,
    getLocalStream,
    getRemoteStream,
    getCallDuration,
    destroy,
  }
}
