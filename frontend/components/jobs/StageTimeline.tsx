'use client'

import { motion } from 'framer-motion'
import { 
  Search, 
  Zap, 
  Code, 
  CheckCircle, 
  Circle,
  Loader2 
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface StageTimelineProps {
  currentStage?: 'planning' | 'analysis' | 'coding' | null
  completedStages?: ('planning' | 'analysis' | 'coding')[]
  showDetails?: boolean
  className?: string
}

export function StageTimeline({ 
  currentStage,
  completedStages = [],
  showDetails = false,
  className 
}: StageTimelineProps) {
  const stages = [
    {
      key: 'planning',
      label: 'Planning',
      description: 'Analyzing paper structure and creating implementation plan',
      icon: Search,
      color: 'blue'
    },
    {
      key: 'analysis',
      label: 'Analysis',
      description: 'Deep technical analysis of algorithms and methods',
      icon: Zap,
      color: 'purple'
    },
    {
      key: 'coding',
      label: 'Coding',
      description: 'Generating code repository from paper content',
      icon: Code,
      color: 'green'
    }
  ]

  const getStageStatus = (stageKey: string) => {
    if (completedStages.includes(stageKey as any)) return 'completed'
    if (currentStage === stageKey) return 'active'
    return 'pending'
  }

  const getStageIcon = (stage: typeof stages[0], status: string) => {
    const Icon = stage.icon
    
    if (status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    } else if (status === 'active') {
      return <Loader2 className="w-5 h-5 text-current animate-spin" />
    } else {
      return <Circle className="w-5 h-5 text-slate-400" />
    }
  }

  const getStageColor = (stage: typeof stages[0], status: string) => {
    if (status === 'completed') {
      return 'text-green-600 dark:text-green-400'
    } else if (status === 'active') {
      switch (stage.color) {
        case 'blue':
          return 'text-blue-600 dark:text-blue-400'
        case 'purple':
          return 'text-purple-600 dark:text-purple-400'
        case 'green':
          return 'text-green-600 dark:text-green-400'
        default:
          return 'text-slate-600 dark:text-slate-400'
      }
    }
    return 'text-slate-400 dark:text-slate-500'
  }

  const getConnectorColor = (index: number) => {
    const currentStatus = getStageStatus(stages[index].key)
    const nextStatus = index < stages.length - 1 ? getStageStatus(stages[index + 1].key) : 'pending'
    
    if (currentStatus === 'completed') {
      return 'bg-green-500'
    } else if (currentStatus === 'active') {
      return 'bg-gradient-to-r from-green-500 to-slate-300 dark:to-slate-600'
    }
    return 'bg-slate-300 dark:bg-slate-600'
  }

  return (
    <div className={cn('relative', className)}>
      <div className="flex items-center justify-between">
        {stages.map((stage, index) => {
          const status = getStageStatus(stage.key)
          const isLast = index === stages.length - 1
          
          return (
            <div key={stage.key} className="flex-1 relative">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center"
              >
                {/* Stage Icon */}
                <div className={cn(
                  'relative z-10 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300',
                  status === 'completed' && 'bg-green-100 dark:bg-green-900/30',
                  status === 'active' && stage.color === 'blue' && 'bg-blue-100 dark:bg-blue-900/30',
                  status === 'active' && stage.color === 'purple' && 'bg-purple-100 dark:bg-purple-900/30',
                  status === 'active' && stage.color === 'green' && 'bg-green-100 dark:bg-green-900/30',
                  status === 'pending' && 'bg-slate-100 dark:bg-slate-800'
                )}>
                  <div className={getStageColor(stage, status)}>
                    {getStageIcon(stage, status)}
                  </div>
                  
                  {/* Active Pulse Animation */}
                  {status === 'active' && (
                    <motion.div
                      className={cn(
                        'absolute inset-0 rounded-full',
                        stage.color === 'blue' && 'bg-blue-400',
                        stage.color === 'purple' && 'bg-purple-400',
                        stage.color === 'green' && 'bg-green-400'
                      )}
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.5, 0, 0.5]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeOut'
                      }}
                    />
                  )}
                </div>

                {/* Stage Label */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 + 0.2 }}
                  className="mt-2 text-center"
                >
                  <p className={cn(
                    'text-sm font-medium transition-colors',
                    status === 'completed' && 'text-green-600 dark:text-green-400',
                    status === 'active' && 'text-slate-800 dark:text-slate-200',
                    status === 'pending' && 'text-slate-400 dark:text-slate-500'
                  )}>
                    {stage.label}
                  </p>
                  
                  {showDetails && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[100px]">
                      {stage.description}
                    </p>
                  )}
                </motion.div>

                {/* Connector Line */}
                {!isLast && (
                  <div className="absolute top-5 left-[50%] w-full h-0.5 -z-10">
                    <motion.div
                      className={cn('h-full rounded-full', getConnectorColor(index))}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ 
                        delay: index * 0.2,
                        duration: 0.5,
                        ease: 'easeOut'
                      }}
                      style={{ transformOrigin: 'left' }}
                    />
                  </div>
                )}
              </motion.div>
            </div>
          )
        })}
      </div>
    </div>
  )
}