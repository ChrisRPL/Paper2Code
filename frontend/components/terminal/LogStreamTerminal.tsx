'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Terminal, 
  Info, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Play,
  Maximize2,
  Minimize2,
  Copy,
  Download
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export interface LogEntry {
  id: string
  timestamp: Date
  stream: 'stdout' | 'stderr' | 'system'
  stage: string
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
  jobId?: string
}

export interface LogStreamTerminalProps {
  logs: LogEntry[]
  isRunning?: boolean
  currentStage?: string
  className?: string
  maxHeight?: string
  title?: string
  onClear?: () => void
}

const logLevelConfig = {
  info: {
    icon: Info,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20'
  },
  success: {
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20'
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20'
  },
  error: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20'
  }
}

const streamConfig = {
  stdout: {
    label: 'OUT',
    color: 'text-green-300',
    bgColor: 'bg-green-900/30'
  },
  stderr: {
    label: 'ERR',
    color: 'text-red-300',
    bgColor: 'bg-red-900/30'
  },
  system: {
    label: 'SYS',
    color: 'text-blue-300',
    bgColor: 'bg-blue-900/30'
  }
}

export function LogStreamTerminal({
  logs,
  isRunning = false,
  currentStage,
  className,
  maxHeight = '500px',
  title = 'Paper2Code Processing Logs',
  onClear
}: LogStreamTerminalProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [filterLevel, setFilterLevel] = useState<string | null>(null)
  const [filterStream, setFilterStream] = useState<string | null>(null)
  const logContainerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  // Handle manual scroll to detect if user scrolled up
  const handleScroll = useCallback(() => {
    if (!logContainerRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
    setAutoScroll(isAtBottom)
  }, [])

  // Filter logs based on selected filters
  const filteredLogs = logs.filter(log => {
    if (filterLevel && log.level !== filterLevel) return false
    if (filterStream && log.stream !== filterStream) return false
    return true
  })

  // Copy logs to clipboard
  const copyLogsToClipboard = useCallback(() => {
    const logText = filteredLogs.map(log => 
      `[${log.timestamp.toLocaleTimeString()}] [${log.stream.toUpperCase()}] [${log.stage}] ${log.message}`
    ).join('\n')
    
    navigator.clipboard.writeText(logText)
  }, [filteredLogs])

  // Download logs as file
  const downloadLogs = useCallback(() => {
    const logText = filteredLogs.map(log => 
      `[${log.timestamp.toISOString()}] [${log.stream.toUpperCase()}] [${log.stage}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n')
    
    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `paper2code-logs-${new Date().toISOString().slice(0, 19)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [filteredLogs])

  const logVariants = {
    initial: { opacity: 0, x: -20, scale: 0.95 },
    animate: { 
      opacity: 1, 
      x: 0, 
      scale: 1,
      transition: { 
        type: 'spring', 
        stiffness: 300, 
        damping: 25,
        duration: 0.3
      }
    },
    exit: { 
      opacity: 0, 
      x: 20, 
      scale: 0.95,
      transition: { duration: 0.2 } 
    }
  }

  return (
    <div className={cn("relative w-full", className)}>
      <motion.div
        animate={{ height: isExpanded ? 'auto' : maxHeight }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={cn(
          "bg-slate-950 rounded-lg border border-slate-800 shadow-2xl overflow-hidden",
          "text-slate-100 font-mono text-sm"
        )}
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {/* Traffic light buttons */}
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              <span className="font-medium">{title}</span>
              {isRunning && (
                <div className="flex items-center gap-1">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Play className="w-3 h-3 text-green-400" />
                  </motion.div>
                  <Badge variant="secondary" className="text-xs">
                    {currentStage || 'Running'}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filters */}
            <div className="flex gap-1">
              {Object.keys(logLevelConfig).map(level => (
                <Button
                  key={level}
                  variant={filterLevel === level ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setFilterLevel(filterLevel === level ? null : level)}
                >
                  {level.toUpperCase()}
                </Button>
              ))}
            </div>

            <div className="w-px h-4 bg-slate-700" />

            {/* Actions */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={copyLogsToClipboard}
              title="Copy logs"
            >
              <Copy className="w-3 h-3" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={downloadLogs}
              title="Download logs"
            >
              <Download className="w-3 h-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Minimize' : 'Maximize'}
            >
              {isExpanded ? (
                <Minimize2 className="w-3 h-3" />
              ) : (
                <Maximize2 className="w-3 h-3" />
              )}
            </Button>
          </div>
        </div>

        {/* Log Content */}
        <div
          ref={logContainerRef}
          onScroll={handleScroll}
          className={cn(
            "overflow-y-auto overflow-x-hidden p-4 space-y-1",
            isExpanded ? 'h-[70vh]' : 'h-full'
          )}
          style={{ maxHeight: isExpanded ? '70vh' : maxHeight }}
        >
          <AnimatePresence initial={false}>
            {filteredLogs.map((log) => {
              const levelConfig = logLevelConfig[log.level]
              const streamConfig_ = streamConfig[log.stream]
              const LevelIcon = levelConfig.icon

              return (
                <motion.div
                  key={log.id}
                  layout
                  variants={logVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className={cn(
                    "flex items-start gap-3 p-2 rounded border-l-2 transition-colors",
                    levelConfig.bgColor,
                    levelConfig.borderColor,
                    "hover:bg-slate-800/50"
                  )}
                >
                  {/* Timestamp */}
                  <span className="text-slate-500 text-xs shrink-0 w-20">
                    {log.timestamp.toLocaleTimeString()}
                  </span>

                  {/* Stream Badge */}
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs font-bold shrink-0",
                    streamConfig_.bgColor,
                    streamConfig_.color
                  )}>
                    {streamConfig_.label}
                  </span>

                  {/* Stage */}
                  <span className="text-slate-400 text-xs shrink-0 w-16 capitalize">
                    {log.stage}
                  </span>

                  {/* Level Icon */}
                  <LevelIcon className={cn("w-4 h-4 shrink-0 mt-0.5", levelConfig.color)} />

                  {/* Message */}
                  <span className="text-slate-200 break-words flex-1 leading-relaxed">
                    {log.message}
                  </span>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Auto-scroll indicator */}
          {logs.length > 0 && !autoScroll && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="sticky bottom-0 flex justify-center pt-2"
            >
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAutoScroll(true)}
                className="text-xs"
              >
                Scroll to bottom
              </Button>
            </motion.div>
          )}

          {/* Empty state */}
          {filteredLogs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-slate-500">
              <Terminal className="w-8 h-8 mb-2" />
              <p className="text-center">
                {logs.length === 0 ? 'No logs yet' : 'No logs match current filters'}
              </p>
            </div>
          )}

          {/* Bottom anchor for auto-scroll */}
          <div ref={bottomRef} />
        </div>

        {/* Footer with stats */}
        <div className="px-4 py-2 bg-slate-900/50 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span>{filteredLogs.length} entries</span>
            {logs.length !== filteredLogs.length && (
              <span>({logs.length} total)</span>
            )}
            <div className="flex items-center gap-1">
              <div className={cn("w-2 h-2 rounded-full", autoScroll ? 'bg-green-400' : 'bg-slate-500')} />
              <span>Auto-scroll {autoScroll ? 'on' : 'off'}</span>
            </div>
          </div>
          
          {onClear && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-6 px-2 text-xs text-slate-400 hover:text-slate-200"
            >
              Clear logs
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  )
}