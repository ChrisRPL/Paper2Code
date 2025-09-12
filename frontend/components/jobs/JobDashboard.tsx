'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useJobStore } from '@/store/index'
import { useWebSocket } from '@/hooks/useWebSocket'
import { JobStatusCard } from './JobStatusCard'
import { AgentStatusIndicator } from './AgentStatusIndicator'
import { Activity, Briefcase, Clock, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface JobDashboardProps {
  className?: string
}

export function JobDashboard({ className }: JobDashboardProps) {
  const { activeJobs, completedJobs, agentStatuses } = useJobStore()
  const { isConnected } = useWebSocket()
  
  const allJobs = [...activeJobs, ...completedJobs].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const stats = {
    active: activeJobs.length,
    completed: completedJobs.length,
    total: allJobs.length
  }

  const handleDownload = async (jobId: string) => {
    try {
      const response = await fetch(`/api/v1/jobs/${jobId}/download`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `paper2code_${jobId}.zip`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const handleViewDetails = (jobId: string) => {
    // This would navigate to a detailed view or open a modal
    console.log('View details for job:', jobId)
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Stats */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Job Dashboard
          </h2>
          
          <div className={cn(
            'flex items-center space-x-2 px-3 py-1 rounded-full text-sm',
            isConnected 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
          )}>
            <div className={cn(
              'w-2 h-2 rounded-full',
              isConnected ? 'bg-green-500' : 'bg-amber-500'
            )}>
              {isConnected && (
                <motion.div
                  className="w-full h-full rounded-full bg-green-400"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [1, 0, 1]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeOut'
                  }}
                />
              )}
            </div>
            <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800"
          >
            <div className="flex items-center space-x-3">
              <Activity className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {stats.active}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Active Jobs
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800"
          >
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {stats.completed}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Completed
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border border-slate-300 dark:border-slate-600"
          >
            <div className="flex items-center space-x-3">
              <Briefcase className="w-8 h-8 text-slate-500" />
              <div>
                <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                  {stats.total}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Total Jobs
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Jobs List - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Recent Jobs
          </h3>
          
          {allJobs.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
              <Clock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">
                No jobs yet. Upload a PDF to get started!
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {allJobs.slice(0, 5).map((job, index) => (
                <motion.div
                  key={job.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <JobStatusCard
                    job={job}
                    isActive={activeJobs.some(j => j.id === job.id)}
                    onDownload={() => handleDownload(job.id)}
                    onViewDetails={() => handleViewDetails(job.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Agent Status - Takes 1 column */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Agent Status
          </h3>
          
          {agentStatuses.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center border border-slate-200 dark:border-slate-700">
              <Brain className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Agents are idle
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                Waiting for jobs...
              </p>
            </div>
          ) : (
            <AgentStatusIndicator agents={agentStatuses} />
          )}

          {/* Quick Stats */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Processing Pipeline
            </h4>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Planning Stage</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">~2-3 min</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Analysis Stage</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">~3-5 min</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Coding Stage</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">~5-10 min</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}