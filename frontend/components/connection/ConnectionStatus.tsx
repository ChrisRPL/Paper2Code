'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useConnectionStore } from '@/store/index'
import { cn } from '@/lib/utils'

interface ConnectionStatusProps {
  className?: string
  showText?: boolean
  compact?: boolean
}

export function ConnectionStatus({ 
  className = '',
  showText = true,
  compact = false
}: ConnectionStatusProps) {
  const { isConnected, isConnecting } = useWebSocket()
  const { status } = useConnectionStore()

  const getStatusConfig = () => {
    if (isConnecting || status === 'connecting') {
      return {
        icon: Loader2,
        text: 'Connecting',
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-500/40',
        textColor: 'text-yellow-400',
        iconColor: 'text-yellow-400',
        pulseColor: 'bg-yellow-400',
        animate: true
      }
    }
    
    if (isConnected && status === 'connected') {
      return {
        icon: Wifi,
        text: 'Connected',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/40',
        textColor: 'text-green-400',
        iconColor: 'text-green-400',
        pulseColor: 'bg-green-400',
        animate: false
      }
    }
    
    return {
      icon: WifiOff,
      text: 'Disconnected',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/40',
      textColor: 'text-red-400',
      iconColor: 'text-red-400',
      pulseColor: 'bg-red-400',
      animate: false
    }
  }

  const config = getStatusConfig()
  const IconComponent = config.icon

  if (compact) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <div className="relative">
          <motion.div
            animate={config.animate ? { rotate: 360 } : {}}
            transition={config.animate ? { 
              duration: 1,
              repeat: Infinity,
              ease: 'linear'
            } : {}}
          >
            <IconComponent className={cn('w-4 h-4', config.iconColor)} />
          </motion.div>
          
          {/* Pulse effect for connected state */}
          <AnimatePresence>
            {status === 'connected' && (
              <motion.div
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 2, opacity: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeOut'
                }}
                className={cn('absolute inset-0 w-4 h-4 rounded-full', config.pulseColor)}
              />
            )}
          </AnimatePresence>
        </div>
        
        {showText && (
          <motion.span
            key={status}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.3 }}
            className={cn('text-sm font-medium', config.textColor)}
          >
            {config.text}
          </motion.span>
        )}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn('relative', className)}
    >
      <div 
        className={cn(
          'relative flex items-center gap-3 px-4 py-2 rounded-xl backdrop-blur-sm border',
          config.bgColor,
          config.borderColor,
          'transition-all duration-500 ease-out'
        )}
      >
        {/* Pulse animation for connected state */}
        <AnimatePresence>
          {status === 'connected' && (
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: 'easeOut'
              }}
              className={cn('absolute left-4 w-5 h-5 rounded-full', config.pulseColor)}
            />
          )}
        </AnimatePresence>

        {/* Icon container */}
        <div className="relative z-10 flex items-center justify-center">
          <motion.div
            animate={config.animate ? { rotate: 360 } : {}}
            transition={config.animate ? { 
              duration: 1,
              repeat: Infinity,
              ease: 'linear'
            } : {}}
          >
            <IconComponent className={cn('w-5 h-5', config.iconColor)} />
          </motion.div>
        </div>

        {/* Status text */}
        {showText && (
          <motion.div
            key={status}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col"
          >
            <span className={cn('font-medium text-sm', config.textColor)}>
              {config.text}
            </span>
          </motion.div>
        )}

        {/* Connection indicator dot */}
        <div className="relative">
          <div className={cn('w-2 h-2 rounded-full', config.pulseColor)} />
          {status === 'connected' && (
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className={cn('absolute inset-0 w-2 h-2 rounded-full', config.pulseColor)}
            />
          )}
        </div>
      </div>
    </motion.div>
  )
}