'use client'

// Meeting Room Page - Entry point for video calls
// Verifies access, shows countdown/waiting room, and launches the VideoCall component

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import VideoCall from '@/components/video/VideoCall'
import { checkMeetingTime, MeetingTimeResult, formatCountdownAr } from '@/lib/meeting-time'
import { useAppStore } from '@/lib/store'
import { bookingsApi } from '@/lib/api'
import {
  Clock, Video, AlertCircle, Loader2, ArrowRight,
  Calendar, Timer, User
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface MeetingInfo {
  booking: {
    id: string
    date: string
    startTime: string
    endTime: string
    status: string
    notes: string | null
    milestoneProgress?: {
      milestoneDefault: {
        id: string
        titleAr: string
        titleEn: string
      }
    } | null
  }
  meetingRoomId: string | null
  timeCheck: MeetingTimeResult
  otherParticipant: {
    id: string
    name: string
    avatarUrl?: string | null
    role: string
  }
  canJoin: boolean
  myRole: string
}

// ============================================================================
// Component
// ============================================================================

export default function MeetingPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string

  const { user, token } = useAppStore()

  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inCall, setInCall] = useState(false)
  const [countdown, setCountdown] = useState<string>('')

  // Fetch meeting info
  useEffect(() => {
    async function fetchMeetingInfo() {
      if (!token) {
        setError('يرجى تسجيل الدخول أولاً')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/meeting/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const result = await response.json()

        if (!result.success) {
          setError(result.error || 'لم يتم العثور على الاجتماع')
          setLoading(false)
          return
        }

        setMeetingInfo(result.data)
        setLoading(false)
      } catch {
        setError('فشل في تحميل بيانات الاجتماع')
        setLoading(false)
      }
    }

    fetchMeetingInfo()
  }, [roomId, token])

  // Countdown timer
  useEffect(() => {
    if (!meetingInfo || inCall) return

    const interval = setInterval(() => {
      const info = meetingInfo
      const timeCheck = checkMeetingTime(
        info.booking.date,
        info.booking.startTime,
        info.booking.endTime,
        info.booking.status
      )

      if (timeCheck.status === 'TOO_EARLY' && timeCheck.secondsUntilStart) {
        setCountdown(formatCountdownAr(timeCheck.secondsUntilStart))
      } else if (timeCheck.status === 'WAITING_ROOM' && timeCheck.secondsUntilStart) {
        setCountdown(formatCountdownAr(timeCheck.secondsUntilStart))
      } else if (timeCheck.status === 'TIME_UP' || timeCheck.status === 'ALREADY_ENDED') {
        setCountdown('')
        // Update meeting info to reflect new status
        setMeetingInfo(prev => prev ? { ...prev, timeCheck, canJoin: false } : null)
      } else if (timeCheck.status === 'IN_PROGRESS') {
        setCountdown('')
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [meetingInfo, inCall])

  // Start the call - update booking status to IN_PROGRESS
  const handleJoinCall = useCallback(async () => {
    if (!meetingInfo || !token) return

    try {
      // Update booking status to IN_PROGRESS
      await bookingsApi.updateBooking(meetingInfo.booking.id, {
        status: 'IN_PROGRESS',
      })
      setInCall(true)
    } catch {
      // Still try to join even if status update fails
      setInCall(true)
    }
  }, [meetingInfo, token])

  // End the call - update booking status to COMPLETED
  const handleCallEnd = useCallback(async () => {
    if (!meetingInfo || !token) {
      router.push('/')
      return
    }

    try {
      await bookingsApi.updateBooking(meetingInfo.booking.id, {
        status: 'COMPLETED',
      })
    } catch {
      // Ignore errors on call end
    }

    router.push('/')
  }, [meetingInfo, token, router])

  const handleCallStart = useCallback(() => {
    // Call started successfully
  }, [])

  // ========================================================================
  // Render: Loading
  // ========================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-300 text-lg">جاري تحميل بيانات الاجتماع...</p>
        </div>
      </div>
    )
  }

  // ========================================================================
  // Render: Error
  // ========================================================================

  if (error || !meetingInfo) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">خطأ</h2>
          <p className="text-gray-400 mb-6">{error || 'لم يتم العثور على الاجتماع'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    )
  }

  // ========================================================================
  // Render: In Call
  // ========================================================================

  if (inCall && user && token) {
    return (
      <div className="min-h-screen bg-gray-900 p-4">
        <div className="max-w-6xl mx-auto h-[calc(100vh-2rem)]">
          <VideoCall
            roomId={roomId}
            userId={user.id}
            userName={user.name}
            token={token}
            otherParticipant={meetingInfo.otherParticipant}
            endTime={meetingInfo.booking.endTime}
            onCallEnd={handleCallEnd}
            onCallStart={handleCallStart}
          />
        </div>
      </div>
    )
  }

  // ========================================================================
  // Render: Pre-call / Waiting Room
  // ========================================================================

  const { timeCheck, booking, otherParticipant } = meetingInfo

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-emerald-600/20 flex items-center justify-center mx-auto mb-4">
              <Video className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-white text-2xl font-bold mb-2">غرفة الاجتماع</h1>
            <p className="text-gray-400">
              جلسة مع{' '}
              <span className="text-emerald-400 font-medium">{otherParticipant.name}</span>
            </p>
          </div>

          {/* Meeting Details */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-3 bg-gray-700/50 rounded-lg p-3">
              <Calendar className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span className="text-gray-300">{booking.date}</span>
            </div>
            <div className="flex items-center gap-3 bg-gray-700/50 rounded-lg p-3">
              <Clock className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span className="text-gray-300">{booking.startTime} - {booking.endTime}</span>
            </div>
            <div className="flex items-center gap-3 bg-gray-700/50 rounded-lg p-3">
              <User className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span className="text-gray-300">
                {otherParticipant.role === 'CONSULTANT' ? 'مستشار' : 'ريادي'}: {otherParticipant.name}
              </span>
            </div>
            {booking.notes && (
              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-gray-400 text-sm mb-1">ملاحظات:</p>
                <p className="text-gray-300 text-sm">{booking.notes}</p>
              </div>
            )}
          </div>

          {/* Status Messages */}
          {timeCheck.status === 'TOO_EARLY' && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6 text-center">
              <Timer className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-yellow-300 font-medium mb-1">الاجتماع لم يفتح بعد</p>
              <p className="text-yellow-300/70 text-sm">
                يفتح قبل 5 دقائق من الموعد - متبقي {countdown}
              </p>
            </div>
          )}

          {timeCheck.status === 'WAITING_ROOM' && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6 text-center">
              <Timer className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <p className="text-blue-300 font-medium mb-1">غرفة الانتظار</p>
              <p className="text-blue-300/70 text-sm">
                يبدأ الاجتماع خلال {countdown}
              </p>
            </div>
          )}

          {timeCheck.status === 'IN_PROGRESS' && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mb-6 text-center">
              <p className="text-emerald-300 font-medium">الاجتماع جارٍ الآن - يمكنك الانضمام</p>
            </div>
          )}

          {timeCheck.status === 'TIME_UP' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 text-center">
              <p className="text-red-300 font-medium">انتهى وقت الاجتماع</p>
            </div>
          )}

          {timeCheck.status === 'ALREADY_ENDED' && (
            <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-4 mb-6 text-center">
              <p className="text-gray-300 font-medium">هذا الاجتماع انتهى بالفعل</p>
            </div>
          )}

          {/* Join Button */}
          {timeCheck.canJoin ? (
            <button
              onClick={handleJoinCall}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              <Video className="w-6 h-6" />
              انضم للاجتماع
            </button>
          ) : (
            <button
              disabled
              className="w-full py-4 bg-gray-600 text-gray-400 rounded-xl text-lg font-bold cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Video className="w-6 h-6" />
              {timeCheck.status === 'TIME_UP' || timeCheck.status === 'ALREADY_ENDED'
                ? 'الاجتماع منتهي'
                : 'غير متاح حالياً'}
            </button>
          )}

          {/* Back button */}
          <button
            onClick={() => router.push('/')}
            className="w-full mt-3 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            العودة
          </button>
        </div>
      </div>
    </div>
  )
}
