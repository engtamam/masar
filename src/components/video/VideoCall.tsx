'use client'

// VideoCall Component - WebRTC video/audio call with screen sharing
// All communication is local via Socket.IO signaling, no external services

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createWebRTCManager, WebRTCManager, CallStatus } from '@/lib/webrtc'
import { formatCountdownAr, getMeetingDurationMinutes } from '@/lib/meeting-time'
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  PhoneOff, Clock, AlertCircle, Loader2, User
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface VideoCallProps {
  roomId: string
  userId: string
  userName: string
  token: string
  otherParticipant: {
    id: string
    name: string
    avatarUrl?: string | null
    role: string
  }
  endTime: string          // HH:mm - meeting end time
  onCallEnd: () => void    // Callback when call ends
  onCallStart?: () => void // Callback when call starts
}

// ============================================================================
// Component
// ============================================================================

export default function VideoCall({
  roomId,
  userId,
  userName,
  token,
  otherParticipant,
  endTime,
  onCallEnd,
  onCallStart,
}: VideoCallProps) {
  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const managerRef = useRef<WebRTCManager | null>(null)

  // State
  const [callStatus, setCallStatus] = useState<CallStatus>('idle')
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [hasRemoteStream, setHasRemoteStream] = useState(false)

  // Duration timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        if (managerRef.current) {
          setCallDuration(managerRef.current.getCallDuration())
        }
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [callStatus])

  // Initialize WebRTC manager
  useEffect(() => {
    const manager = createWebRTCManager({
      onLocalStream: (stream) => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }
      },
      onRemoteStream: (stream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream
        }
        setHasRemoteStream(true)
      },
      onStatusChange: (status) => {
        setCallStatus(status)
        if (status === 'connected' && onCallStart) {
          onCallStart()
        }
      },
      onTimeUp: () => {
        setErrorMessage('انتهى وقت الاجتماع')
        setTimeout(onCallEnd, 3000)
      },
      onError: (error) => {
        setErrorMessage(error)
      },
      onParticipantJoined: () => {
        // Other participant joined
      },
      onParticipantLeft: () => {
        setHasRemoteStream(false)
        setErrorMessage('غادر الطرف الآخر الاجتماع')
        setTimeout(onCallEnd, 3000)
      },
    })

    managerRef.current = manager

    return () => {
      manager.destroy()
    }
  }, [onCallEnd, onCallStart])

  // Auto-start call
  useEffect(() => {
    if (managerRef.current && callStatus === 'idle') {
      managerRef.current.startCall(roomId, userId, userName, token)
    }
  }, [roomId, userId, userName, token, callStatus])

  // Toggle audio
  const handleToggleAudio = useCallback(() => {
    if (managerRef.current) {
      const enabled = managerRef.current.toggleAudio()
      setIsAudioEnabled(enabled)
    }
  }, [])

  // Toggle video
  const handleToggleVideo = useCallback(() => {
    if (managerRef.current) {
      const enabled = managerRef.current.toggleVideo()
      setIsVideoEnabled(enabled)
    }
  }, [])

  // Toggle screen share
  const handleToggleScreenShare = useCallback(async () => {
    if (managerRef.current) {
      if (isScreenSharing) {
        managerRef.current.stopScreenShare()
        setIsScreenSharing(false)
      } else {
        const success = await managerRef.current.startScreenShare()
        setIsScreenSharing(success)
      }
    }
  }, [isScreenSharing])

  // End call
  const handleEndCall = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.endCall()
    }
    onCallEnd()
  }, [onCallEnd])

  // Format duration
  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-xl overflow-hidden flex flex-col">
      {/* Remote Video (main view) */}
      <div className="flex-1 relative">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* No remote stream placeholder */}
        {!hasRemoteStream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800">
            <div className="w-24 h-24 rounded-full bg-emerald-600/20 flex items-center justify-center mb-4">
              <User className="w-12 h-12 text-emerald-400" />
            </div>
            <p className="text-white text-lg font-medium">
              {callStatus === 'connecting' || callStatus === 'ringing'
                ? 'جاري الاتصال...'
                : `${otherParticipant.name}`}
            </p>
            {callStatus === 'connecting' && (
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mt-3" />
            )}
          </div>
        )}

        {/* Local Video (picture-in-picture) */}
        <div className="absolute bottom-4 left-4 w-40 h-30 md:w-48 md:h-36 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
          />
          {!isVideoEnabled && (
            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
              <VideoOff className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Call Duration & Timer */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2">
          {callStatus === 'connected' ? (
            <>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white text-sm font-mono">
                {formatDuration(callDuration)}
              </span>
            </>
          ) : callStatus === 'connecting' ? (
            <span className="text-yellow-300 text-sm">جاري الاتصال...</span>
          ) : (
            <span className="text-gray-300 text-sm">{getStatusTextAr(callStatus)}</span>
          )}
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="absolute top-4 right-4 bg-red-500/80 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center gap-2 max-w-sm">
            <AlertCircle className="w-5 h-5 text-white flex-shrink-0" />
            <span className="text-white text-sm">{errorMessage}</span>
          </div>
        )}

        {/* Meeting end time reminder */}
        {callStatus === 'connected' && (
          <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-300" />
            <span className="text-emerald-300 text-xs">ينتهي {endTime}</span>
          </div>
        )}

        {/* Screen sharing indicator */}
        {isScreenSharing && (
          <div className="absolute top-16 right-4 bg-blue-500/80 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <Monitor className="w-4 h-4 text-white" />
            <span className="text-white text-xs">مشاركة الشاشة</span>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="h-20 bg-gray-800/90 backdrop-blur-sm flex items-center justify-center gap-3 md:gap-4 px-4">
        {/* Microphone */}
        <button
          onClick={handleToggleAudio}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
            isAudioEnabled
              ? 'bg-gray-600 hover:bg-gray-500 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
          title={isAudioEnabled ? 'كتم الصوت' : 'إلغاء كتم الصوت'}
        >
          {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* Camera */}
        <button
          onClick={handleToggleVideo}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
            isVideoEnabled
              ? 'bg-gray-600 hover:bg-gray-500 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
          title={isVideoEnabled ? 'إيقاف الكاميرا' : 'تشغيل الكاميرا'}
        >
          {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        {/* Screen Share */}
        <button
          onClick={handleToggleScreenShare}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
            isScreenSharing
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-gray-600 hover:bg-gray-500 text-white'
          }`}
          title={isScreenSharing ? 'إيقاف مشاركة الشاشة' : 'مشاركة الشاشة'}
        >
          {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
        </button>

        {/* End Call */}
        <button
          onClick={handleEndCall}
          className="w-14 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all duration-200 shadow-lg"
          title="إنهاء المكالمة"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function getStatusTextAr(status: CallStatus): string {
  switch (status) {
    case 'idle': return 'في الانتظار'
    case 'connecting': return 'جاري الاتصال'
    case 'ringing': return 'يرن'
    case 'connected': return 'متصل'
    case 'ended': return 'انتهت المكالمة'
    case 'failed': return 'فشل الاتصال'
    default: return ''
  }
}
