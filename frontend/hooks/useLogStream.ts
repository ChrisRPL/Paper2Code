'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWebSocket } from './useWebSocket'
import type { LogEntry } from '@/components/terminal/LogStreamTerminal'

export interface LogStreamConfig {
  jobId?: string
  maxLogs?: number
  autoSubscribe?: boolean
}

export function useLogStream(config: LogStreamConfig = {}) {
  const { jobId, maxLogs = 1000, autoSubscribe = true } = config
  const { lastMessage, subscribeToJob, unsubscribeFromJob } = useWebSocket()

  const [logs, setLogs] = useState<LogEntry[]>([])
  const [currentJobId, setCurrentJobId] = useState<string | null>(jobId || null)
  const [isRunning, setIsRunning] = useState(false)
  const [currentStage, setCurrentStage] = useState<string>('')

  // Add a new log entry
  const addLog = useCallback((entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newLog: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...entry
    }

    setLogs(prev => {
      const updated = [newLog, ...prev]
      // Keep only the most recent logs
      return updated.slice(0, maxLogs)
    })
  }, [maxLogs])

  // Clear all logs
  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  // Start logging for a new job
  const startJob = useCallback((newJobId: string) => {
    setCurrentJobId(newJobId)
    clearLogs()
    setIsRunning(true)
    setCurrentStage('')
    
    if (autoSubscribe) {
      subscribeToJob(newJobId)
    }

    // Add initial log
    addLog({
      stream: 'system',
      stage: 'init',
      level: 'info',
      message: `Started processing job: ${newJobId}`,
      jobId: newJobId
    })
  }, [autoSubscribe, subscribeToJob, clearLogs, addLog])

  // Stop current job
  const stopJob = useCallback(() => {
    if (currentJobId) {
      addLog({
        stream: 'system',
        stage: currentStage || 'unknown',
        level: 'info',
        message: `Stopped processing job: ${currentJobId}`,
        jobId: currentJobId
      })

      if (autoSubscribe) {
        unsubscribeFromJob(currentJobId)
      }
    }
    
    setIsRunning(false)
    setCurrentJobId(null)
  }, [currentJobId, currentStage, autoSubscribe, unsubscribeFromJob, addLog])

  // Determine log level from message content
  const getLogLevel = useCallback((message: string, streamType: 'stdout' | 'stderr' | 'system') => {
    const lowerMessage = message.toLowerCase()
    
    if (streamType === 'stderr') {
      return 'error'
    }
    
    if (lowerMessage.includes('error') || lowerMessage.includes('failed') || lowerMessage.includes('exception')) {
      return 'error'
    }
    
    if (lowerMessage.includes('warning') || lowerMessage.includes('warn')) {
      return 'warning'
    }
    
    if (lowerMessage.includes('success') || lowerMessage.includes('completed') || lowerMessage.includes('finished')) {
      return 'success'
    }
    
    return 'info'
  }, [])

  // Process WebSocket messages
  useEffect(() => {
    if (!lastMessage || !currentJobId) return

    const { type, payload } = lastMessage

    switch (type) {
      case 'job_started':
        if (payload.job_id === currentJobId) {
          setIsRunning(true)
          setCurrentStage(payload.stage)
          
          addLog({
            stream: 'system',
            stage: payload.stage,
            level: 'info',
            message: `Started ${payload.stage} stage for ${payload.filename}`,
            jobId: payload.job_id
          })
        }
        break

      case 'job_stage_update':
        if (payload.job_id === currentJobId) {
          setCurrentStage(payload.stage)
          
          // Handle real-time log streaming
          if (payload.log) {
            const { stream, message } = payload.log
            const streamType = stream === 'stdout' ? 'stdout' : 'stderr'
            
            addLog({
              stream: streamType,
              stage: payload.stage,
              level: getLogLevel(message, streamType),
              message: message.trim(),
              jobId: payload.job_id
            })
          }
          
          // Handle progress updates
          if (payload.progress !== undefined) {
            addLog({
              stream: 'system',
              stage: payload.stage,
              level: 'info',
              message: `${payload.stage} progress: ${payload.progress}%${payload.message ? ` - ${payload.message}` : ''}`,
              jobId: payload.job_id
            })
          }
        }
        break

      case 'job_artifact':
        if (payload.job_id === currentJobId) {
          const artifactCount = payload.artifact_data?.artifact_count || 
                              payload.artifact_data?.file_count || 0
          
          addLog({
            stream: 'system',
            stage: payload.stage,
            level: 'success',
            message: `Generated ${artifactCount} ${payload.artifact_type} artifacts`,
            jobId: payload.job_id
          })
        }
        break

      case 'job_completed':
        if (payload.job_id === currentJobId) {
          setIsRunning(false)
          
          addLog({
            stream: 'system',
            stage: 'completed',
            level: 'success',
            message: `Job completed successfully! Repository: ${payload.repository_path}`,
            jobId: payload.job_id
          })
          
          if (payload.processing_time) {
            addLog({
              stream: 'system',
              stage: 'completed',
              level: 'info',
              message: `Total processing time: ${payload.processing_time}s`,
              jobId: payload.job_id
            })
          }
        }
        break

      case 'job_error':
        if (payload.job_id === currentJobId) {
          setIsRunning(false)
          
          addLog({
            stream: 'system',
            stage: payload.stage || currentStage,
            level: 'error',
            message: `Job failed: ${payload.error}`,
            jobId: payload.job_id
          })
        }
        break

      case 'agent_status':
        if (payload.job_id === currentJobId) {
          addLog({
            stream: 'system',
            stage: currentStage,
            level: 'info',
            message: `Agent ${payload.agent}: ${payload.status} (${payload.progress}%)${payload.current_task ? ` - ${payload.current_task}` : ''}`,
            jobId: payload.job_id
          })
        }
        break

      case 'chat_message':
        if (payload.job_id === currentJobId) {
          addLog({
            stream: 'system',
            stage: currentStage,
            level: payload.message_type === 'error' ? 'error' : 'info',
            message: payload.message,
            jobId: payload.job_id
          })
        }
        break

      case 'ping':
        // Handle ping/pong for connection testing
        addLog({
          stream: 'system',
          stage: 'connection',
          level: 'info',
          message: 'WebSocket ping received',
          jobId: currentJobId
        })
        break
    }
  }, [lastMessage, currentJobId, currentStage, addLog, getLogLevel])

  // Auto-subscribe to job updates
  useEffect(() => {
    if (jobId && autoSubscribe && jobId !== currentJobId) {
      startJob(jobId)
    }

    return () => {
      if (autoSubscribe && currentJobId) {
        stopJob()
      }
    }
  }, [jobId, autoSubscribe, currentJobId, startJob, stopJob])

  // Get logs filtered by various criteria
  const getLogsByLevel = useCallback((level: string) => {
    return logs.filter(log => log.level === level)
  }, [logs])

  const getLogsByStage = useCallback((stage: string) => {
    return logs.filter(log => log.stage === stage)
  }, [logs])

  const getLogsByStream = useCallback((stream: string) => {
    return logs.filter(log => log.stream === stream)
  }, [logs])

  // Get recent logs (last N entries)
  const getRecentLogs = useCallback((count: number) => {
    return logs.slice(0, count)
  }, [logs])

  return {
    logs,
    isRunning,
    currentStage,
    currentJobId,
    
    // Actions
    addLog,
    clearLogs,
    startJob,
    stopJob,
    
    // Filters
    getLogsByLevel,
    getLogsByStage,
    getLogsByStream,
    getRecentLogs,
    
    // Stats
    totalLogs: logs.length,
    errorCount: getLogsByLevel('error').length,
    warningCount: getLogsByLevel('warning').length,
    successCount: getLogsByLevel('success').length
  }
}