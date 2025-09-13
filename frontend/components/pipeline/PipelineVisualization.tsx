'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Check, Clock, Play, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export interface PipelineStage {
  id: string
  name: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'error'
  progress: number
  duration?: number
  artifacts?: number
}

export interface PipelineVisualizationProps {
  stages: PipelineStage[]
  className?: string
}

const stageIcons = {
  pending: Clock,
  running: Play,
  completed: Check,
  error: AlertCircle
}

const stageColors = {
  pending: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    border: 'border-slate-300 dark:border-slate-600',
    text: 'text-slate-600 dark:text-slate-400',
    icon: 'text-slate-500 dark:text-slate-400'
  },
  running: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-300 dark:border-blue-600',
    text: 'text-blue-900 dark:text-blue-100',
    icon: 'text-blue-600 dark:text-blue-400'
  },
  completed: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-300 dark:border-green-600',
    text: 'text-green-900 dark:text-green-100',
    icon: 'text-green-600 dark:text-green-400'
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-300 dark:border-red-600',
    text: 'text-red-900 dark:text-red-100',
    icon: 'text-red-600 dark:text-red-400'
  }
}

export function PipelineVisualization({ stages, className }: PipelineVisualizationProps) {
  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Pipeline Progress Overview */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex items-center gap-2 relative">
          {stages.map((stage, index) => {
            const colors = stageColors[stage.status]
            const Icon = stageIcons[stage.status]
            
            return (
              <React.Fragment key={stage.id}>
                {/* Stage Circle */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "relative w-12 h-12 rounded-full border-2 flex items-center justify-center",
                    colors.bg,
                    colors.border
                  )}
                >
                  <Icon className={cn("w-5 h-5", colors.icon)} />
                  
                  {/* Running pulse animation */}
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
                      className="absolute inset-0 rounded-full bg-blue-400 -z-10"
                    />
                  )}
                </motion.div>
                
                {/* Connector Line */}
                {index < stages.length - 1 && (
                  <div className="relative w-16 h-0.5">
                    <div className="absolute inset-0 bg-slate-300 dark:bg-slate-600" />
                    
                    {/* Progress overlay */}
                    {(stage.status === 'completed' || 
                      (stage.status === 'running' && stage.progress === 100)) && (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="absolute inset-0 bg-green-500"
                      />
                    )}
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* Detailed Stage Cards */}
      <div className="space-y-4">
        {stages.map((stage, index) => {
          const colors = stageColors[stage.status]
          const Icon = stageIcons[stage.status]
          
          return (
            <motion.div
              key={stage.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "p-6 rounded-lg border-2 transition-all duration-300",
                colors.bg,
                colors.border
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "p-2 rounded-full",
                    stage.status === 'running' ? 'bg-blue-100 dark:bg-blue-800' : 'bg-transparent'
                  )}>
                    <Icon className={cn("w-5 h-5", colors.icon)} />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className={cn("font-semibold text-lg", colors.text)}>
                        {stage.name}
                      </h3>
                      <Badge 
                        variant={stage.status === 'completed' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {stage.status}
                      </Badge>
                    </div>
                    
                    <p className={cn("text-sm opacity-80", colors.text)}>
                      {stage.description}
                    </p>
                    
                    {/* Progress Bar */}
                    {(stage.status === 'running' || stage.status === 'completed') && (
                      <div className="w-full max-w-md">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className={cn("font-medium", colors.text)}>
                            Progress
                          </span>
                          <span className={cn("opacity-80", colors.text)}>
                            {stage.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${stage.progress}%` }}
                            transition={{ duration: 0.5 }}
                            className={cn(
                              "h-2 rounded-full transition-all duration-300",
                              stage.status === 'completed' 
                                ? 'bg-green-500' 
                                : 'bg-blue-500'
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Stage Stats */}
                <div className="text-right space-y-1">
                  {stage.duration && (
                    <div className={cn("text-sm", colors.text)}>
                      <span className="opacity-60">Duration: </span>
                      <span className="font-mono">{stage.duration}s</span>
                    </div>
                  )}
                  {stage.artifacts && stage.artifacts > 0 && (
                    <div className={cn("text-sm", colors.text)}>
                      <span className="opacity-60">Artifacts: </span>
                      <span className="font-semibold">{stage.artifacts}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}