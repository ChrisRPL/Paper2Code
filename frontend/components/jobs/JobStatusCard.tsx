'use client'

import { motion } from 'framer-motion'
import { 
  Clock, 
  Download, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Calendar,
  Folder
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Job } from '@/types'
import { ProgressBar } from './ProgressBar'
import { StageTimeline } from './StageTimeline'

interface JobStatusCardProps {
  job: Job
  isActive?: boolean
  onDownload?: () => void
  onViewDetails?: () => void
}

export function JobStatusCard({ 
  job, 
  isActive = false,
  onDownload,
  onViewDetails 
}: JobStatusCardProps) {
  const getStatusIcon = () => {
    switch (job.status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-slate-400" />
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <FileText className="w-5 h-5 text-slate-400" />
    }
  }

  const getStatusColor = () => {
    switch (job.status) {
      case 'pending':
        return 'from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700'
      case 'processing':
        return 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800'
      case 'completed':
        return 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'
      case 'error':
        return 'from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-red-200 dark:border-red-800'
      default:
        return 'from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700'
    }
  }

  const formatDuration = () => {
    if (!job.startedAt) return null
    const start = new Date(job.startedAt).getTime()
    const end = job.completedAt ? new Date(job.completedAt).getTime() : Date.now()
    const duration = Math.floor((end - start) / 1000)
    
    if (duration < 60) return `${duration}s`
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'relative overflow-hidden rounded-2xl border-2 transition-all duration-300',
        'bg-gradient-to-br',
        getStatusColor(),
        isActive && 'shadow-xl scale-[1.02]',
        'hover:shadow-lg hover:scale-[1.01]'
      )}
    >
      {/* Animated Background Pattern */}
      {job.status === 'processing' && (
        <div className="absolute inset-0 opacity-5">
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_theme(colors.blue.500)_0%,_transparent_40%)]"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
      )}

      <div className="relative p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              {getStatusIcon()}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 truncate">
                {job.filename || 'Processing Paper'}
              </h3>
              
              <div className="flex items-center space-x-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(job.createdAt).toLocaleTimeString()}</span>
                </span>
                
                {formatDuration() && (
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatDuration()}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {job.status === 'completed' && (
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onViewDetails}
                className="p-2 rounded-lg bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 transition-colors"
              >
                <Folder className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onDownload}
                className="p-2 rounded-lg bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 transition-colors"
              >
                <Download className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </motion.button>
            </div>
          )}
        </div>

        {/* Progress Section */}
        {job.status === 'processing' && (
          <div className="space-y-3">
            <ProgressBar 
              progress={job.progress} 
              stage={job.stage}
              showPercentage
            />
            
            {job.currentTask && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300"
              >
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="truncate">{job.currentTask}</span>
              </motion.div>
            )}
          </div>
        )}

        {/* Stage Timeline */}
        {(job.status === 'processing' || job.status === 'completed') && (
          <StageTimeline 
            currentStage={job.stage}
            completedStages={
              job.status === 'completed' 
                ? ['planning', 'analysis', 'coding'] 
                : job.stage === 'analysis' 
                  ? ['planning']
                  : job.stage === 'coding'
                    ? ['planning', 'analysis']
                    : []
            }
          />
        )}

        {/* Error Message */}
        {job.status === 'error' && job.error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800"
          >
            <p className="text-sm text-red-700 dark:text-red-300">
              {job.error}
            </p>
          </motion.div>
        )}

        {/* Job ID */}
        <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Job ID: {job.id.slice(0, 8)}...
          </p>
        </div>
      </div>

      {/* Active Indicator */}
      {isActive && job.status === 'processing' && (
        <motion.div
          className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-500"
          animate={{
            opacity: [0.5, 1, 0.5]
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