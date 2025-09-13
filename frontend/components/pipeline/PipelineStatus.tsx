'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Clock, CheckCircle, AlertCircle, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import type { PipelineStage } from './PipelineVisualization'

export interface PipelineStatusProps {
  stages: PipelineStage[]
  overallProgress: number
  currentStage?: PipelineStage
  className?: string
  compact?: boolean
}

export function PipelineStatus({ 
  stages, 
  overallProgress, 
  currentStage,
  className,
  compact = false 
}: PipelineStatusProps) {
  const completedStages = stages.filter(s => s.status === 'completed').length
  const totalStages = stages.length
  const hasError = stages.some(s => s.status === 'error')
  const isRunning = stages.some(s => s.status === 'running')
  const isCompleted = completedStages === totalStages

  const getStatusIcon = () => {
    if (hasError) return AlertCircle
    if (isCompleted) return CheckCircle
    if (isRunning) return Play
    return Clock
  }

  const getStatusColor = () => {
    if (hasError) return 'text-red-500'
    if (isCompleted) return 'text-green-500'
    if (isRunning) return 'text-blue-500'
    return 'text-slate-500'
  }

  const getStatusText = () => {
    if (hasError) return 'Error'
    if (isCompleted) return 'Completed'
    if (isRunning && currentStage) return `Running ${currentStage.name}`
    return 'Pending'
  }

  const StatusIcon = getStatusIcon()

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="flex items-center gap-2">
          <motion.div
            animate={isRunning ? { rotate: 360 } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <StatusIcon className={cn("w-4 h-4", getStatusColor())} />
          </motion.div>
          <span className="text-sm font-medium">
            {completedStages}/{totalStages} stages
          </span>
        </div>
        <div className="flex-1 max-w-32">
          <Progress value={overallProgress} className="h-2" />
        </div>
        <span className="text-xs text-muted-foreground">
          {Math.round(overallProgress)}%
        </span>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            animate={isRunning ? { rotate: 360 } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className={cn(
              "p-2 rounded-full",
              hasError ? 'bg-red-100 dark:bg-red-900/20' :
              isCompleted ? 'bg-green-100 dark:bg-green-900/20' :
              isRunning ? 'bg-blue-100 dark:bg-blue-900/20' :
              'bg-slate-100 dark:bg-slate-800'
            )}
          >
            <StatusIcon className={cn("w-5 h-5", getStatusColor())} />
          </motion.div>
          
          <div>
            <h3 className="font-semibold text-lg">Pipeline Status</h3>
            <p className="text-sm text-muted-foreground">
              {getStatusText()}
            </p>
          </div>
        </div>

        <Badge 
          variant={
            hasError ? 'destructive' :
            isCompleted ? 'default' :
            isRunning ? 'secondary' :
            'outline'
          }
        >
          {completedStages}/{totalStages} Complete
        </Badge>
      </div>

      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Overall Progress</span>
          <span className="text-muted-foreground">
            {Math.round(overallProgress)}%
          </span>
        </div>
        <Progress value={overallProgress} className="h-3" />
      </div>

      {/* Stage Indicators */}
      <div className="flex items-center gap-2">
        {stages.map((stage, index) => (
          <div key={stage.id} className="flex items-center gap-2">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "w-3 h-3 rounded-full border-2",
                stage.status === 'completed' ? 'bg-green-500 border-green-500' :
                stage.status === 'running' ? 'bg-blue-500 border-blue-500' :
                stage.status === 'error' ? 'bg-red-500 border-red-500' :
                'bg-slate-200 border-slate-300 dark:bg-slate-700 dark:border-slate-600'
              )}
            >
              {stage.status === 'running' && (
                <motion.div
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [1, 0, 1]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                  className="absolute inset-0 w-3 h-3 rounded-full bg-blue-400 -z-10"
                />
              )}
            </motion.div>
            
            <span className="text-xs text-muted-foreground capitalize">
              {stage.id}
            </span>
            
            {index < stages.length - 1 && (
              <div className="w-4 h-0.5 bg-slate-300 dark:bg-slate-600" />
            )}
          </div>
        ))}
      </div>

      {/* Current Stage Details */}
      {currentStage && isRunning && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100">
                {currentStage.name}
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                {currentStage.description}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                {currentStage.progress}%
              </div>
              {currentStage.duration && (
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  {currentStage.duration}s
                </div>
              )}
            </div>
          </div>
          
          <Progress 
            value={currentStage.progress} 
            className="h-2 mt-2"
          />
        </motion.div>
      )}
    </div>
  )
}