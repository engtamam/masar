// Tests for WebRTC helper library
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createWebRTCManager } from '@/lib/webrtc'

// Mock Socket.IO
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  })),
}))

// Mock RTCPeerConnection
const mockPeerConnection = {
  addTrack: vi.fn(),
  ontrack: null as ((event: Event) => void) | null,
  onicecandidate: null as ((event: Event) => void) | null,
  onconnectionstatechange: null as (() => void) | null,
  oniceconnectionstatechange: null as (() => void) | null,
  createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'test-sdp' }),
  createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'test-sdp-answer' }),
  setLocalDescription: vi.fn().mockResolvedValue(undefined),
  setRemoteDescription: vi.fn().mockResolvedValue(undefined),
  addIceCandidate: vi.fn().mockResolvedValue(undefined),
  getSenders: vi.fn().mockReturnValue([{ track: { kind: 'video' }, replaceTrack: vi.fn() }]),
  close: vi.fn(),
  localDescription: { toJSON: () => ({ type: 'offer', sdp: 'test-sdp' }) },
  connectionState: 'new',
  iceConnectionState: 'new',
}

vi.stubGlobal('RTCPeerConnection', vi.fn(() => mockPeerConnection))

// Mock MediaStream
class MockMediaStream {
  id = 'mock-stream-' + Math.random().toString(36).slice(2)
  active = true
  _tracks: MediaStreamTrack[] = []
  constructor(tracks: MediaStreamTrack[] = []) {
    this._tracks = tracks
  }
  getTracks() { return this._tracks }
  getAudioTracks() { return this._tracks.filter(t => t.kind === 'audio') }
  getVideoTracks() { return this._tracks.filter(t => t.kind === 'video') }
  addTrack() {}
  removeTrack() {}
  clone() { return new MockMediaStream(this._tracks) }
}

vi.stubGlobal('MediaStream', MockMediaStream)

// Mock navigator.mediaDevices
const mockTracks = [
  { kind: 'audio', enabled: true, stop: vi.fn(), onended: null } as unknown as MediaStreamTrack,
  { kind: 'video', enabled: true, stop: vi.fn(), onended: null } as unknown as MediaStreamTrack,
]

vi.stubGlobal('navigator', {
  mediaDevices: {
    getUserMedia: vi.fn().mockResolvedValue(new MockMediaStream(mockTracks)),
    getDisplayMedia: vi.fn().mockResolvedValue(
      new MockMediaStream([
        { kind: 'video', enabled: true, stop: vi.fn(), onended: null } as unknown as MediaStreamTrack,
      ])
    ),
  },
})

describe('createWebRTCManager', () => {
  let manager: ReturnType<typeof createWebRTCManager>

  const callbacks = {
    onLocalStream: vi.fn(),
    onRemoteStream: vi.fn(),
    onStatusChange: vi.fn(),
    onTimeUp: vi.fn(),
    onError: vi.fn(),
    onParticipantJoined: vi.fn(),
    onParticipantLeft: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    manager = createWebRTCManager(callbacks)
  })

  it('should create a manager with all required methods', () => {
    expect(manager.startCall).toBeDefined()
    expect(manager.joinCall).toBeDefined()
    expect(manager.endCall).toBeDefined()
    expect(manager.toggleAudio).toBeDefined()
    expect(manager.toggleVideo).toBeDefined()
    expect(manager.startScreenShare).toBeDefined()
    expect(manager.stopScreenShare).toBeDefined()
    expect(manager.getStatus).toBeDefined()
    expect(manager.getLocalStream).toBeDefined()
    expect(manager.getRemoteStream).toBeDefined()
    expect(manager.getCallDuration).toBeDefined()
    expect(manager.destroy).toBeDefined()
  })

  it('should start with idle status', () => {
    expect(manager.getStatus()).toBe('idle')
  })

  it('should return zero call duration when not in call', () => {
    expect(manager.getCallDuration()).toBe(0)
  })

  it('should return null streams when not in call', () => {
    expect(manager.getLocalStream()).toBeNull()
    expect(manager.getRemoteStream()).toBeNull()
  })

  it('should toggle audio and return new state', () => {
    const result = manager.toggleAudio()
    expect(typeof result).toBe('boolean')
  })

  it('should toggle video and return new state', () => {
    const result = manager.toggleVideo()
    expect(typeof result).toBe('boolean')
  })

  it('should emit status change on end call', () => {
    manager.endCall()
    expect(callbacks.onStatusChange).toHaveBeenCalledWith('ended')
  })

  it('should emit status change on destroy', () => {
    manager.destroy()
    expect(callbacks.onStatusChange).toHaveBeenCalledWith('idle')
  })

  it('should attempt to start call and request media', async () => {
    try {
      await manager.startCall('test-room', 'user-1', 'Test User', 'test-token')
    } catch {
      // May fail due to mock limitations
    }
    // The important thing is it attempts to get user media
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled()
  })

  it('should attempt to join call and request media', async () => {
    try {
      await manager.joinCall('test-room', 'user-1', 'Test User', 'test-token')
    } catch {
      // May fail due to mock limitations
    }
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled()
  })
})
