'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWebSocket } from './useWebSocket'
import type { PipelineStage } from '@/components/pipeline/PipelineVisualization'

export interface PipelineStateConfig {
  jobId?: string
  autoSubscribe?: boolean
}

export function usePipelineState(config: PipelineStateConfig = {}) {
  const { jobId, autoSubscribe = true } = config
  const { lastMessage, subscribeToJob, unsubscribeFromJob } = useWebSocket()

  // Initialize with default Paper2Code stages
  const [stages, setStages] = useState<PipelineStage[]>([
    {
      id: 'planning',
      name: 'Planning',
      description: 'Analyzing paper structure and generating implementation plan',
      status: 'pending',
      progress: 0
    },
    {
      id: 'analysis',
      name: 'Analysis',
      description: 'Detailed technical analysis of algorithms and methods',
      status: 'pending',
      progress: 0
    },
    {
      id: 'coding',
      name: 'Code Generation',
      description: 'Generating functional code repository from analysis',
      status: 'pending',
      progress: 0
    }
  ])

  const [currentJobId, setCurrentJobId] = useState<string | null>(jobId || null)
  const [startTime, setStartTime] = useState<Date | null>(null)

  // Update stage state
  const updateStage = useCallback((stageId: string, updates: Partial<PipelineStage>) => {
    setStages(prev => prev.map(stage => 
      stage.id === stageId 
        ? { ...stage, ...updates }
        : stage
    ))
  }, [])

  // Reset pipeline to initial state
  const resetPipeline = useCallback(() => {
    setStages(prev => prev.map(stage => ({
      ...stage,
      status: 'pending' as const,
      progress: 0,
      duration: undefined,
      artifacts: undefined
    })))
    setStartTime(null)
  }, [])

  // Start new job
  const startJob = useCallback((newJobId: string) => {
    setCurrentJobId(newJobId)
    resetPipeline()
    setStartTime(new Date())
    
    if (autoSubscribe) {
      subscribeToJob(newJobId)
    }
  }, [autoSubscribe, subscribeToJob, resetPipeline])

  // Stop current job
  const stopJob = useCallback(() => {
    if (currentJobId && autoSubscribe) {
      unsubscribeFromJob(currentJobId)
    }
    setCurrentJobId(null)
  }, [currentJobId, autoSubscribe, unsubscribeFromJob])

  // Calculate stage durations
  const calculateDuration = useCallback((stageStartTime: Date) => {
    return Math.floor((Date.now() - stageStartTime.getTime()) / 1000)
  }, [])

  // Process WebSocket messages
  useEffect(() => {
    if (!lastMessage || !currentJobId) return

    const { type, payload } = lastMessage

    switch (type) {
      case 'job_started':
        if (payload.job_id === currentJobId) {
          const stageId = payload.stage
          updateStage(stageId, {
            status: 'running',
            progress: 10
          })
        }
        break

      case 'job_stage_update':
        if (payload.job_id === currentJobId) {
          const stageId = payload.stage
          const progress = payload.progress || 0
          
          // Handle log messages
          if (payload.log) {
            // Real-time log streaming is handled by the terminal component
            return
          }

          updateStage(stageId, {
            status: progress === 100 ? 'completed' : 'running',
            progress,
            duration: startTime ? calculateDuration(startTime) : undefined
          })
        }
        break

      case 'job_artifact':
        if (payload.job_id === currentJobId) {
          const stageId = payload.stage
          const artifactCount = payload.artifact_data?.artifact_count || 
                              payload.artifact_data?.file_count || 0

          updateStage(stageId, {
            artifacts: artifactCount
          })
        }
        break

      case 'job_completed':
        if (payload.job_id === currentJobId) {
          // Mark final stage as completed
          updateStage('coding', {
            status: 'completed',
            progress: 100,
            duration: startTime ? calculateDuration(startTime) : undefined
          })
        }
        break

      case 'job_error':
        if (payload.job_id === currentJobId) {
          const stageId = payload.stage || 'coding' // Default to current stage
          updateStage(stageId, {
            status: 'error'
          })
        }
        break

      case 'agent_status':
        if (payload.job_id === currentJobId) {
          // Map agent status to stage updates if needed
          const progress = payload.progress || 0
          
          // Determine stage based on agent or current progress
          let stageId = 'planning'
          if (progress > 33 && progress <= 66) stageId = 'analysis'
          else if (progress > 66) stageId = 'coding'

          updateStage(stageId, {
            status: payload.status === 'completed' ? 'completed' : 'running',
            progress: Math.min(progress, 100)
          })
        }
        break
    }
  }, [lastMessage, currentJobId, updateStage, startTime, calculateDuration])

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

  // Calculate overall progress
  const overallProgress = stages.reduce((sum, stage) => sum + stage.progress, 0) / stages.length

  // Get current active stage
  const currentStage = stages.find(stage => stage.status === 'running') || 
                      stages.find(stage => stage.status === 'pending')

  return {
    stages,
    overallProgress,
    currentStage,
    currentJobId,
    startTime,
    
    // Actions
    updateStage,
    resetPipeline,
    startJob,
    stopJob,
    
    // Computed state
    isRunning: stages.some(stage => stage.status === 'running'),
    isCompleted: stages.every(stage => stage.status === 'completed'),
    hasError: stages.some(stage => stage.status === 'error')
  }
}