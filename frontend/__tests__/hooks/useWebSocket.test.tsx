import { renderHook, act } from '@testing-library/react'
import { useWebSocket } from '../../hooks/useWebSocket'
import { createMockWebSocket } from '../utils/test-utils'

// Mock WebSocket
const mockWebSocket = createMockWebSocket()
const mockWebSocketConstructor = jest.fn(() => mockWebSocket)

// Replace global WebSocket
global.WebSocket = mockWebSocketConstructor as any

describe('useWebSocket Hook', () => {
  const defaultUrl = 'ws://localhost:8000/ws/test-client'

  beforeEach(() => {
    mockWebSocketConstructor.mockClear()
    mockWebSocket.addEventListener.mockClear()
    mockWebSocket.removeEventListener.mockClear()
    mockWebSocket.send.mockClear()
    mockWebSocket.close.mockClear()
    mockWebSocket.readyState = WebSocket.CONNECTING
  })

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useWebSocket(defaultUrl))

    expect(result.current.isConnected).toBe(false)
    expect(result.current.connectionStatus).toBe('disconnected')
    expect(result.current.lastMessage).toBe(null)
    expect(result.current.error).toBe(null)
  })

  it('creates WebSocket connection with correct URL', () => {
    renderHook(() => useWebSocket(defaultUrl))

    expect(mockWebSocketConstructor).toHaveBeenCalledWith(defaultUrl)
  })

  it('sets up event listeners correctly', () => {
    renderHook(() => useWebSocket(defaultUrl))

    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('open', expect.any(Function))
    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('message', expect.any(Function))
    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('error', expect.any(Function))
    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('close', expect.any(Function))
  })

  it('handles connection open event', () => {
    const { result } = renderHook(() => useWebSocket(defaultUrl))

    // Simulate connection open
    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN
      const openHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )[1]
      openHandler()
    })

    expect(result.current.isConnected).toBe(true)
    expect(result.current.connectionStatus).toBe('connected')
  })

  it('handles message reception', () => {
    const { result } = renderHook(() => useWebSocket(defaultUrl))

    const testMessage = {
      type: 'job_progress',
      payload: { job_id: 'test-123', progress: 50 }
    }

    // Simulate message reception
    act(() => {
      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )[1]
      messageHandler({ data: JSON.stringify(testMessage) })
    })

    expect(result.current.lastMessage).toEqual(testMessage)
  })

  it('handles connection error', () => {
    const { result } = renderHook(() => useWebSocket(defaultUrl))

    const errorEvent = new Error('Connection failed')

    // Simulate error
    act(() => {
      const errorHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )[1]
      errorHandler(errorEvent)
    })

    expect(result.current.error).toBe(errorEvent)
    expect(result.current.connectionStatus).toBe('error')
  })

  it('handles connection close', () => {
    const { result } = renderHook(() => useWebSocket(defaultUrl))

    // First connect
    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN
      const openHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )[1]
      openHandler()
    })

    // Then disconnect
    act(() => {
      mockWebSocket.readyState = WebSocket.CLOSED
      const closeHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'close'
      )[1]
      closeHandler({ code: 1000, reason: 'Normal closure' })
    })

    expect(result.current.isConnected).toBe(false)
    expect(result.current.connectionStatus).toBe('disconnected')
  })

  it('sends messages correctly', () => {
    const { result } = renderHook(() => useWebSocket(defaultUrl))

    // Connect first
    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN
      const openHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )[1]
      openHandler()
    })

    const message = { type: 'subscribe', job_id: 'test-123' }

    act(() => {
      result.current.sendMessage(message)
    })

    expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(message))
  })

  it('does not send message when disconnected', () => {
    const { result } = renderHook(() => useWebSocket(defaultUrl))

    const message = { type: 'subscribe', job_id: 'test-123' }

    act(() => {
      result.current.sendMessage(message)
    })

    expect(mockWebSocket.send).not.toHaveBeenCalled()
  })

  it('subscribes to job updates', () => {
    const { result } = renderHook(() => useWebSocket(defaultUrl))

    // Connect first
    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN
      const openHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )[1]
      openHandler()
    })

    act(() => {
      result.current.subscribeToJob('test-job-123')
    })

    expect(mockWebSocket.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'subscribe', job_id: 'test-job-123' })
    )
  })

  it('unsubscribes from job updates', () => {
    const { result } = renderHook(() => useWebSocket(defaultUrl))

    // Connect first
    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN
      const openHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )[1]
      openHandler()
    })

    act(() => {
      result.current.unsubscribeFromJob('test-job-123')
    })

    expect(mockWebSocket.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'unsubscribe', job_id: 'test-job-123' })
    )
  })

  it('attempts reconnection on close', () => {
    jest.useFakeTimers()

    const { result } = renderHook(() => useWebSocket(defaultUrl, { autoReconnect: true }))

    // Simulate connection close
    act(() => {
      mockWebSocket.readyState = WebSocket.CLOSED
      const closeHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'close'
      )[1]
      closeHandler({ code: 1006, reason: 'Abnormal closure' })
    })

    expect(result.current.connectionStatus).toBe('reconnecting')

    // Fast-forward time to trigger reconnection
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    // Should attempt to create new WebSocket connection
    expect(mockWebSocketConstructor).toHaveBeenCalledTimes(2)

    jest.useRealTimers()
  })

  it('respects reconnection attempts limit', () => {
    jest.useFakeTimers()

    const maxAttempts = 3
    renderHook(() => useWebSocket(defaultUrl, {
      autoReconnect: true,
      maxReconnectAttempts: maxAttempts
    }))

    // Simulate multiple connection failures
    for (let i = 0; i < maxAttempts + 1; i++) {
      act(() => {
        mockWebSocket.readyState = WebSocket.CLOSED
        const closeHandler = mockWebSocket.addEventListener.mock.calls.find(
          call => call[0] === 'close'
        )[1]
        closeHandler({ code: 1006, reason: 'Abnormal closure' })
      })

      act(() => {
        jest.advanceTimersByTime(1000)
      })
    }

    // Should not exceed max attempts + 1 (initial connection)
    expect(mockWebSocketConstructor).toHaveBeenCalledTimes(maxAttempts + 1)

    jest.useRealTimers()
  })

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useWebSocket(defaultUrl))

    unmount()

    expect(mockWebSocket.close).toHaveBeenCalled()
  })

  it('handles invalid JSON messages gracefully', () => {
    const { result } = renderHook(() => useWebSocket(defaultUrl))

    // Simulate invalid JSON message
    act(() => {
      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )[1]
      messageHandler({ data: 'invalid json' })
    })

    // Should not crash and message should remain null
    expect(result.current.lastMessage).toBe(null)
  })

  it('updates connection status correctly through lifecycle', () => {
    const { result } = renderHook(() => useWebSocket(defaultUrl))

    expect(result.current.connectionStatus).toBe('disconnected')

    // Connecting
    act(() => {
      mockWebSocket.readyState = WebSocket.CONNECTING
    })

    // Connected
    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN
      const openHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )[1]
      openHandler()
    })

    expect(result.current.connectionStatus).toBe('connected')

    // Disconnected
    act(() => {
      mockWebSocket.readyState = WebSocket.CLOSED
      const closeHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'close'
      )[1]
      closeHandler({ code: 1000, reason: 'Normal closure' })
    })

    expect(result.current.connectionStatus).toBe('disconnected')
  })
})