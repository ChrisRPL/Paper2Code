'use client'

import { motion } from 'framer-motion'
import { 
  Brain, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Sparkles,
  FileText,
  Code,
  Search,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Message } from '@/types'

interface MessageBubbleProps {
  message: Message
  isLatest?: boolean
}

export function MessageBubble({ message, isLatest = false }: MessageBubbleProps) {
  const getMessageStyle = (type: Message['type']) => {
    switch (type) {
      case 'success':
        return {
          bgClass: 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800',
          iconClass: 'text-green-600 dark:text-green-400',
          textClass: 'text-green-800 dark:text-green-200',
          icon: CheckCircle
        }
      case 'error':
        return {
          bgClass: 'bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-red-200 dark:border-red-800',
          iconClass: 'text-red-600 dark:text-red-400', 
          textClass: 'text-red-800 dark:text-red-200',
          icon: AlertTriangle
        }
      case 'system':
        return {
          bgClass: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800',
          iconClass: 'text-blue-600 dark:text-blue-400',
          textClass: 'text-blue-800 dark:text-blue-200', 
          icon: Info
        }
      case 'user':
        return {
          bgClass: 'bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border-slate-300 dark:border-slate-600',
          iconClass: 'text-slate-600 dark:text-slate-400',
          textClass: 'text-slate-800 dark:text-slate-200',
          icon: FileText
        }
      case 'agent':
        return {
          bgClass: 'bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800',
          iconClass: 'text-purple-600 dark:text-purple-400',
          textClass: 'text-purple-800 dark:text-purple-200',
          icon: Brain
        }
    }
  }

  const getAgentIcon = (content: string) => {
    if (content.includes('Planning') || content.includes('planning')) return Search
    if (content.includes('Analysis') || content.includes('analysis')) return Zap  
    if (content.includes('Coding') || content.includes('coding')) return Code
    return Sparkles
  }

  const { bgClass, iconClass, textClass, icon: DefaultIcon } = getMessageStyle(message.type)
  const AgentIcon = message.type === 'agent' ? getAgentIcon(message.content) : DefaultIcon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.4,
        type: 'spring',
        stiffness: 150,
        damping: 20
      }}
      className={cn(
        'relative group max-w-4xl mx-auto',
        isLatest && 'animate-pulse-subtle'
      )}
    >
      <div className={cn(
        'flex items-start space-x-3 p-4 rounded-2xl border backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300',
        bgClass,
        'hover:scale-[1.01] hover:-translate-y-0.5'
      )}>
        {/* Icon */}
        <div className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm',
          'bg-white/80 dark:bg-slate-800/80 border border-white/50 dark:border-slate-700/50'
        )}>
          <AgentIcon className={cn('w-4 h-4', iconClass)} />
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          <div className={cn('text-sm leading-relaxed', textClass)}>
            {/* Parse emojis and make them slightly bigger */}
            {message.content.split(/(\p{Emoji_Presentation})/gu).map((part, index) => 
              /\p{Emoji_Presentation}/u.test(part) ? (
                <span key={index} className="text-base mr-1">{part}</span>
              ) : (
                <span key={index}>{part}</span>
              )
            )}
          </div>
          
          {/* Timestamp */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs opacity-60">
              {new Date(message.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
            
            {/* Job ID badge if present */}
            {message.jobId && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 opacity-60">
                Job: {message.jobId.slice(0, 8)}...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Subtle glow effect for latest message */}
      {isLatest && (
        <motion.div 
          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400/10 to-indigo-400/10 -z-10 blur-xl"
          animate={{ 
            scale: [1, 1.05, 1],
            opacity: [0.3, 0.6, 0.3] 
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut" 
          }}
        />
      )}
    </motion.div>
  )
}

// Typing indicator component for when agents are processing
export function TypingIndicator({ agentName = 'AI Agent' }: { agentName?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto"
    >
      <div className="flex items-center space-x-3 p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-blue-50/50 dark:from-slate-900/50 dark:to-blue-900/20 border border-slate-200 dark:border-slate-700 backdrop-blur-sm">
        {/* Animated Agent Icon */}
        <motion.div 
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-white/80 dark:bg-slate-800/80 border border-white/50 dark:border-slate-700/50"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
          <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </motion.div>

        {/* Typing Animation */}
        <div className="flex-1 flex items-center space-x-2">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {agentName} is thinking
          </span>
          
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.4, 1, 0.4]
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}