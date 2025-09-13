'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  progress: number
  stage?: 'planning' | 'analysis' | 'coding' | null
  showPercentage?: boolean
  showStageLabels?: boolean
  className?: string
}

export function ProgressBar({ 
  progress, 
  stage,
  showPercentage = false,
  showStageLabels = false,
  className 
}: ProgressBarProps) {
  // Calculate stage-specific progress
  const getStageProgress = () => {
    if (!stage) return { planning: 0, analysis: 0, coding: 0 }
    
    // Each stage represents roughly 33% of total progress
    const stageProgress = {
      planning: 0,
      analysis: 0,
      coding: 0
    }

    if (stage === 'planning') {
      stageProgress.planning = Math.min(progress * 3, 100) // Scale 0-33% to 0-100%
    } else if (stage === 'analysis') {
      stageProgress.planning = 100
      stageProgress.analysis = Math.min((progress - 33) * 3, 100) // Scale 33-66% to 0-100%
    } else if (stage === 'coding') {
      stageProgress.planning = 100
      stageProgress.analysis = 100
      stageProgress.coding = Math.min((progress - 66) * 3, 100) // Scale 66-100% to 0-100%
    }

    return stageProgress
  }

  const stageProgress = getStageProgress()
  
  const stages = [
    { key: 'planning', label: 'Planning', color: 'from-blue-400 to-blue-500', progress: stageProgress.planning },
    { key: 'analysis', label: 'Analysis', color: 'from-purple-400 to-purple-500', progress: stageProgress.analysis },
    { key: 'coding', label: 'Coding', color: 'from-green-400 to-green-500', progress: stageProgress.coding }
  ]

  return (
    <div className={cn('space-y-2', className)}>
      {/* Single Progress Bar Mode */}
      {!showStageLabels ? (
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            {stage && (
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 capitalize">
                {stage} Stage
              </span>
            )}
            {showPercentage && (
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {Math.round(progress)}%
              </span>
            )}
          </div>
          
          <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className={cn(
                'absolute inset-y-0 left-0 rounded-full bg-gradient-to-r',
                stage === 'planning' && 'from-blue-400 to-blue-500',
                stage === 'analysis' && 'from-purple-400 to-purple-500',
                stage === 'coding' && 'from-green-400 to-green-500',
                !stage && 'from-blue-400 to-indigo-500'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              {/* Animated Shimmer Effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{
                  x: ['-100%', '200%']
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear'
                }}
              />
            </motion.div>
            
            {/* Progress Indicator Dot */}
            {progress > 0 && progress < 100 && (
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md border-2 border-blue-500"
                initial={{ left: 0 }}
                animate={{ left: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{ marginLeft: '-6px' }}
              />
            )}
          </div>
        </div>
      ) : (
        /* Multi-Stage Progress Bars */
        <div className="space-y-3">
          {stages.map((stageItem, index) => (
            <div key={stageItem.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <motion.div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      stageItem.progress > 0 ? 'bg-gradient-to-r ' + stageItem.color : 'bg-slate-300 dark:bg-slate-600'
                    )}
                    animate={stageItem.progress > 0 && stageItem.progress < 100 ? {
                      scale: [1, 1.3, 1],
                      opacity: [1, 0.7, 1]
                    } : {}}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                  />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {stageItem.label}
                  </span>
                </div>
                
                {showPercentage && (
                  <span className="text-xs text-slate-500 dark:text-slate-500">
                    {Math.round(stageItem.progress)}%
                  </span>
                )}
              </div>
              
              <div className="relative h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className={cn('absolute inset-y-0 left-0 rounded-full bg-gradient-to-r', stageItem.color)}
                  initial={{ width: 0 }}
                  animate={{ width: `${stageItem.progress}%` }}
                  transition={{ 
                    duration: 0.5, 
                    ease: 'easeOut',
                    delay: index * 0.1 
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}