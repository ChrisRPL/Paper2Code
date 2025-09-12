'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { 
  Brain, 
  Search, 
  Zap, 
  Code, 
  CheckCircle,
  Loader2,
  Clock,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AgentStatus } from '@/types'

interface AgentStatusIndicatorProps {
  agents: AgentStatus[]
  className?: string
  compact?: boolean
}

export function AgentStatusIndicator({ 
  agents, 
  className,
  compact = false 
}: AgentStatusIndicatorProps) {
  const getAgentIcon = (agent: AgentStatus) => {
    switch (agent.agent) {
      case 'planning':
        return Search
      case 'analysis':
        return Zap
      case 'coding':
        return Code
      default:
        return Brain
    }
  }

  const getAgentColor = (agent: AgentStatus) => {
    switch (agent.agent) {
      case 'planning':
        return 'from-blue-400 to-blue-500'
      case 'analysis':
        return 'from-purple-400 to-purple-500'
      case 'coding':
        return 'from-green-400 to-green-500'
      default:
        return 'from-slate-400 to-slate-500'
    }
  }

  const getStatusIcon = (status: AgentStatus['status']) => {
    switch (status) {
      case 'idle':
        return <Clock className="w-3 h-3" />
      case 'processing':
        return <Loader2 className="w-3 h-3 animate-spin" />
      case 'completed':
        return <CheckCircle className="w-3 h-3" />
      default:
        return <Activity className="w-3 h-3" />
    }
  }

  const getStatusColor = (status: AgentStatus['status']) => {
    switch (status) {
      case 'idle':
        return 'text-slate-400 dark:text-slate-500'
      case 'processing':
        return 'text-blue-500 dark:text-blue-400'
      case 'completed':
        return 'text-green-500 dark:text-green-400'
      default:
        return 'text-slate-400 dark:text-slate-500'
    }
  }

  if (compact) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        {agents.map((agent) => {
          const Icon = getAgentIcon(agent)
          
          return (
            <motion.div
              key={agent.agent}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative"
            >
              <div className={cn(
                'relative w-8 h-8 rounded-lg flex items-center justify-center',
                'bg-gradient-to-br',
                agent.status === 'processing' ? getAgentColor(agent) : 'from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600',
                'shadow-sm'
              )}>
                <Icon className="w-4 h-4 text-white" />
                
                {agent.status === 'processing' && (
                  <motion.div
                    className="absolute inset-0 rounded-lg bg-white/30"
                    animate={{
                      opacity: [0, 0.5, 0]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                  />
                )}
                
                {/* Status Indicator Dot */}
                <div className={cn(
                  'absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800',
                  agent.status === 'idle' && 'bg-slate-400',
                  agent.status === 'processing' && 'bg-blue-500',
                  agent.status === 'completed' && 'bg-green-500'
                )}>
                  {agent.status === 'processing' && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-blue-400"
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [1, 0, 1]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeOut'
                      }}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      <AnimatePresence mode="popLayout">
        {agents.map((agent, index) => {
          const Icon = getAgentIcon(agent)
          
          return (
            <motion.div
              key={agent.agent}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                'relative p-4 rounded-xl border-2 transition-all duration-300',
                agent.status === 'processing' 
                  ? 'bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-blue-200 dark:border-blue-800 shadow-lg'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              )}
            >
              <div className="flex items-start space-x-3">
                {/* Agent Icon */}
                <div className={cn(
                  'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                  'bg-gradient-to-br shadow-sm',
                  agent.status === 'processing' ? getAgentColor(agent) : 'from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600'
                )}>
                  <Icon className="w-5 h-5 text-white" />
                  
                  {agent.status === 'processing' && (
                    <motion.div
                      className="absolute inset-0 rounded-lg bg-white/20"
                      animate={{
                        opacity: [0, 0.5, 0]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut'
                      }}
                    />
                  )}
                </div>

                {/* Agent Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 capitalize">
                      {agent.agent} Agent
                    </h4>
                    
                    <div className={cn('flex items-center space-x-1', getStatusColor(agent.status))}>
                      {getStatusIcon(agent.status)}
                      <span className="text-xs capitalize">{agent.status}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {agent.progress !== undefined && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Progress
                        </span>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                          {agent.progress}%
                        </span>
                      </div>
                      
                      <div className="relative h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          className={cn('absolute inset-y-0 left-0 rounded-full bg-gradient-to-r', getAgentColor(agent))}
                          initial={{ width: 0 }}
                          animate={{ width: `${agent.progress}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Current Task */}
                  {agent.currentTask && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50"
                    >
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        {agent.currentTask}
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Activity Indicator */}
              {agent.status === 'processing' && (
                <motion.div
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-400 to-indigo-500"
                  animate={{
                    scaleX: [0, 1, 0],
                    x: ['0%', '100%', '0%']
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'linear'
                  }}
                  style={{ transformOrigin: 'left' }}
                />
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}