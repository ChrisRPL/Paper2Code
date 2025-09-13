'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowDown, MessageCircle } from 'lucide-react'
import { useChatStore, useJobStore } from '@/store/index'
import { MessageBubble, TypingIndicator } from './MessageBubble'
import { cn } from '@/lib/utils'

interface ChatContainerProps {
  className?: string
  showWelcome?: boolean
}

export function ChatContainer({ className, showWelcome = true }: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [userHasScrolled, setUserHasScrolled] = useState(false)
  
  const { messages, isTyping } = useChatStore()
  const { activeJobs } = useJobStore()
  
  // Check if any job is currently processing to show typing indicator
  const isProcessing = activeJobs.some(job => job.status === 'processing')

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = (smooth = true) => {
    if (scrollRef.current) {
      const scrollOptions: ScrollIntoViewOptions = smooth 
        ? { behavior: 'smooth', block: 'end' }
        : { behavior: 'auto', block: 'end' }
      
      scrollRef.current.scrollIntoView(scrollOptions)
    }
  }

  // Check if user is at bottom of chat
  const checkIsAtBottom = () => {
    if (!scrollRef.current?.parentElement) return true
    
    const container = scrollRef.current.parentElement
    const threshold = 50 // pixels from bottom
    const isBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - threshold
    
    return isBottom
  }

  // Handle scroll events
  const handleScroll = () => {
    const atBottom = checkIsAtBottom()
    setIsAtBottom(atBottom)
    
    if (!atBottom) {
      setUserHasScrolled(true)
    } else {
      setUserHasScrolled(false)
    }
  }

  // Auto-scroll when messages change, but only if user hasn't manually scrolled up
  useEffect(() => {
    if (!userHasScrolled || isAtBottom) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        scrollToBottom(!userHasScrolled) // Instant scroll for first render, smooth for new messages
      }, 100)
    }
  }, [messages.length, userHasScrolled, isAtBottom])

  // Reset scroll behavior when processing starts/stops
  useEffect(() => {
    if (isProcessing && !userHasScrolled) {
      scrollToBottom(true)
    }
  }, [isProcessing, userHasScrolled])

  return (
    <div className={cn(
      'relative flex flex-col h-full bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-900/50 dark:to-slate-800/50',
      className
    )}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-slate-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            {isProcessing && (
              <motion.div 
                className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-900"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Processing Updates
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isProcessing ? 'AI agents working...' : 'Ready for new tasks'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div 
        className="flex-1 overflow-y-auto py-4 space-y-4"
        onScroll={handleScroll}
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* Welcome Message */}
        {showWelcome && messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 mb-4">
              <MessageCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              Ready to Transform Research
            </h4>
            <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Upload a PDF paper above and watch our AI agents provide real-time updates as they transform your research into working code.
            </p>
          </motion.div>
        )}

        {/* Messages List */}
        <AnimatePresence initial={false}>
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              isLatest={index === messages.length - 1}
            />
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        <AnimatePresence>
          {(isTyping || isProcessing) && (
            <TypingIndicator 
              agentName={
                activeJobs[0]?.stage === 'planning' ? 'Planning Agent' :
                activeJobs[0]?.stage === 'analysis' ? 'Analysis Agent' :
                activeJobs[0]?.stage === 'coding' ? 'Coding Agent' :
                'AI Agent'
              }
            />
          )}
        </AnimatePresence>

        {/* Auto-scroll anchor */}
        <div ref={scrollRef} />
      </div>

      {/* Scroll to Bottom Button */}
      <AnimatePresence>
        {!isAtBottom && messages.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={() => {
              scrollToBottom(true)
              setUserHasScrolled(false)
            }}
            className="absolute bottom-4 right-4 w-12 h-12 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
          >
            <ArrowDown className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200" />
            
            {/* New messages indicator */}
            {messages.length > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                {messages.length}
              </div>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}