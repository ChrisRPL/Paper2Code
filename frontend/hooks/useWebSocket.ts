'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useConnectionStore, useChatStore, useJobStore } from '@/store/index'

// WebSocket message types (matching backend schema)
export type WebSocketMessageType = 
  | 'job_started'
  | 'job_stage_update'
  | 'job_artifact'
  | 'job_completed'
  | 'job_error'
  | 'chat_message'
  | 'chat_typing'
  | 'agent_status'
  | 'agent_log'
  | 'ping'
  | 'pong'
  | 'subscribed'
  | 'unsubscribed'
  | 'error'

export interface WebSocketMessage {
  type: WebSocketMessageType
  payload: any
  timestamp: string
}

export interface WebSocketRequest {
  type: 'ping' | 'subscribe_job' | 'unsubscribe_job'
  payload: Record<string, any>
}

interface UseWebSocketOptions {
  url?: string
  autoConnect?: boolean
  maxReconnectAttempts?: number
  reconnectInterval?: number
  maxReconnectInterval?: number
}

interface UseWebSocketReturn {
  isConnected: boolean
  isConnecting: boolean
  lastMessage: WebSocketMessage | null
  sendMessage: (message: WebSocketRequest) => void
  subscribeToJob: (jobId: string) => void
  unsubscribeFromJob: (jobId: string) => void
  connect: () => void
  disconnect: () => void
}

const getDefaultUrl = () => {
  if (typeof window === 'undefined') {
    return 'ws://localhost:8000/api/v1/ws/' // Default for SSR
  }
  return process.env.NODE_ENV === 'production' 
    ? `wss://${window.location.host}/api/v1/ws/`
    : 'ws://localhost:8000/api/v1/ws/'
}

const DEFAULT_OPTIONS: Required<UseWebSocketOptions> = {
  url: getDefaultUrl(),
  autoConnect: true,
  maxReconnectAttempts: 10,
  reconnectInterval: 1000, // Start with 1 second
  maxReconnectInterval: 30000, // Max 30 seconds
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  // Refs for persistent values
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const subscribedJobsRef = useRef<Set<string>>(new Set())
  
  // Local state
  const [isConnecting, setIsConnecting] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  
  // Zustand stores
  const { status: connectionStatus, setConnectionStatus, setJobId } = useConnectionStore()
  const { addMessage } = useChatStore()
  const { updateJob, updateAgentStatus } = useJobStore()
  
  const isConnected = connectionStatus === 'connected'

  // Calculate exponential backoff with jitter
  const calculateBackoffDelay = useCallback((attempt: number): number => {
    const baseDelay = opts.reconnectInterval
    const exponentialDelay = Math.min(
      baseDelay * Math.pow(2, attempt), 
      opts.maxReconnectInterval
    )
    // Add random jitter (±25%) to prevent thundering herd
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5)
    return Math.floor(exponentialDelay + jitter)
  }, [opts.reconnectInterval, opts.maxReconnectInterval])

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)
      setLastMessage(message)
      
      // Handle different message types
      switch (message.type) {
        case 'job_started':
          addMessage({
            content: `🚀 Processing started for ${message.payload.filename}`,
            type: 'system'
          })
          setJobId(message.payload.job_id)
          break
          
        case 'job_stage_update':
          updateJob(message.payload.job_id, {
            stage: message.payload.stage as 'planning' | 'analysis' | 'coding',
            progress: message.payload.progress,
            status: message.payload.progress < 100 ? 'processing' : 'completed'
          })
          
          if (message.payload.message) {
            addMessage({
              content: `📋 ${message.payload.stage}: ${message.payload.message}`,
              type: 'system'
            })
          }
          break
          
        case 'job_completed':
          updateJob(message.payload.job_id, {
            status: 'completed',
            progress: 100,
            repositoryPath: message.payload.repository_path,
            completedAt: new Date()
          })
          addMessage({
            content: `✅ Processing complete! Repository ready for download.`,
            type: 'success'
          })
          break
          
        case 'job_error':
          updateJob(message.payload.job_id, {
            status: 'error',
            error: message.payload.error
          })
          addMessage({
            content: `❌ Error: ${message.payload.error}`,
            type: 'error'
          })
          break
          
        case 'chat_message':
          addMessage({
            content: message.payload.message,
            type: message.payload.type as 'user' | 'agent' | 'system',
            jobId: message.payload.job_id
          })
          break
          
        case 'agent_status':
          updateAgentStatus({
            agent: message.payload.agent as 'planning' | 'analysis' | 'coding',
            status: message.payload.status as 'idle' | 'processing' | 'completed',
            progress: message.payload.progress,
            currentTask: message.payload.current_task
          })
          break
          
        case 'pong':
          // Heartbeat response - connection is healthy
          break
          
        case 'subscribed':
          console.log(`✅ Subscribed to job: ${message.payload.job_id}`)
          break
          
        case 'unsubscribed':
          console.log(`❌ Unsubscribed from job: ${message.payload.job_id}`)
          break
          
        case 'error':
          console.error('WebSocket error:', message.payload.message)
          addMessage({
            content: `Connection error: ${message.payload.message}`,
            type: 'error'
          })
          break
          
        default:
          console.log('Unknown message type:', message.type)
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }, [addMessage, updateJob, updateAgentStatus, setJobId])

  // Send message helper
  const sendMessage = useCallback((message: WebSocketRequest) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message))
      } catch (error) {
        console.error('Failed to send WebSocket message:', error)
      }
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message)
    }
  }, [])

  // Job subscription helpers
  const subscribeToJob = useCallback((jobId: string) => {
    subscribedJobsRef.current.add(jobId)
    sendMessage({
      type: 'subscribe_job',
      payload: { job_id: jobId }
    })
  }, [sendMessage])

  const unsubscribeFromJob = useCallback((jobId: string) => {
    subscribedJobsRef.current.delete(jobId)
    sendMessage({
      type: 'unsubscribe_job',
      payload: { job_id: jobId }
    })
  }, [sendMessage])

  // Re-subscribe to jobs after reconnection
  const resubscribeToJobs = useCallback(() => {
    for (const jobId of subscribedJobsRef.current) {
      sendMessage({
        type: 'subscribe_job',
        payload: { job_id: jobId }
      })
    }
  }, [sendMessage])

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      return // Already connecting
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return // Already connected
    }

    try {
      setIsConnecting(true)
      setConnectionStatus('connecting')
      
      const ws = new WebSocket(opts.url)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('🔗 WebSocket connected')
        setIsConnecting(false)
        setConnectionStatus('connected')
        reconnectAttemptsRef.current = 0
        
        // Re-subscribe to jobs
        resubscribeToJobs()
        
        // Start heartbeat
        const heartbeat = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            sendMessage({ type: 'ping', payload: {} })
          } else {
            clearInterval(heartbeat)
          }
        }, 30000) // Ping every 30 seconds
      }

      ws.onmessage = handleMessage

      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason)
        setIsConnecting(false)
        setConnectionStatus('disconnected')
        
        // Attempt reconnection if not manually closed
        if (event.code !== 1000 && reconnectAttemptsRef.current < opts.maxReconnectAttempts) {
          const delay = calculateBackoffDelay(reconnectAttemptsRef.current)
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${opts.maxReconnectAttempts})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            connect()
          }, delay)
        } else if (reconnectAttemptsRef.current >= opts.maxReconnectAttempts) {
          console.error('❌ Max reconnection attempts reached')
          addMessage({
            content: 'Connection lost. Please refresh the page to reconnect.',
            type: 'error'
          })
        }
      }

      ws.onerror = (error) => {
        console.error('🚨 WebSocket error:', error)
        setIsConnecting(false)
        setConnectionStatus('disconnected')
      }

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      setIsConnecting(false)
      setConnectionStatus('disconnected')
    }
  }, [opts.url, opts.maxReconnectAttempts, calculateBackoffDelay, handleMessage, resubscribeToJobs, sendMessage, setConnectionStatus, addMessage])

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect')
      wsRef.current = null
    }
    
    setIsConnecting(false)
    setConnectionStatus('disconnected')
    subscribedJobsRef.current.clear()
  }, [setConnectionStatus])

  // Auto-connect on mount
  useEffect(() => {
    if (opts.autoConnect) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, []) // Only run on mount/unmount

  return {
    isConnected,
    isConnecting,
    lastMessage,
    sendMessage,
    subscribeToJob,
    unsubscribeFromJob,
    connect,
    disconnect,
  }
}