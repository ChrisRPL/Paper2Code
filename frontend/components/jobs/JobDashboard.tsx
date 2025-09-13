'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useJobStore } from '@/store/index'
import { useWebSocket } from '@/hooks/useWebSocket'
import { usePipelineState } from '@/hooks/usePipelineState'
import { useLogStream } from '@/hooks/useLogStream'
import { JobStatusCard } from './JobStatusCard'
import { AgentStatusIndicator } from './AgentStatusIndicator'
import { PipelineVisualization, PipelineStatus } from '@/components/pipeline'
import { LogStreamTerminal } from '@/components/terminal'
import { Activity, Briefcase, Clock, CheckCircle, Brain, Terminal, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface JobDashboardProps {
  className?: string
}

export function JobDashboard({ className }: JobDashboardProps) {
  const { activeJobs, jobHistory, agentStatus } = useJobStore()
  const { isConnected } = useWebSocket()
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'overview' | 'pipeline' | 'logs'>('overview')
  
  // Get the currently active job or the first job
  const currentJob = activeJobs[0] || (jobHistory.length > 0 ? jobHistory[0] : null)
  const currentJobId = selectedJobId || currentJob?.id || null
  
  // Initialize pipeline and log streaming for current job
  const pipelineState = usePipelineState({ 
    jobId: currentJobId,
    autoSubscribe: !!currentJobId 
  })
  
  const logStream = useLogStream({ 
    jobId: currentJobId,
    maxLogs: 500,
    autoSubscribe: !!currentJobId 
  })
  
  const allJobs = [...activeJobs, ...jobHistory].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const stats = {
    active: activeJobs.length,
    completed: jobHistory.length,
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
    setSelectedJobId(jobId)
    setViewMode('pipeline')
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Stats */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              Job Dashboard
            </h2>
            {currentJob && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Current: {currentJob.filename} • {currentJob.status}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {/* View Mode Tabs */}
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('overview')}
                className={cn(
                  'flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  viewMode === 'overview'
                    ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
                )}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Overview</span>
              </button>
              
              <button
                onClick={() => setViewMode('pipeline')}
                className={cn(
                  'flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  viewMode === 'pipeline'
                    ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
                )}
              >
                <Activity className="w-4 h-4" />
                <span>Pipeline</span>
              </button>
              
              <button
                onClick={() => setViewMode('logs')}
                className={cn(
                  'flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  viewMode === 'logs'
                    ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
                )}
              >
                <Terminal className="w-4 h-4" />
                <span>Logs</span>
              </button>
            </div>
            
            {/* Connection Status */}
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

      {/* Dynamic Content Based on View Mode */}
      {viewMode === 'overview' && (
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
                      onViewDetails={() => setSelectedJobId(job.id)}
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
            
            {agentStatus.length === 0 ? (
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
              <AgentStatusIndicator agents={agentStatus} />
            )}

            {/* Current Job Pipeline Status */}
            {currentJobId && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Current Pipeline
                </h4>
                <PipelineStatus 
                  stages={pipelineState.stages}
                  overallProgress={pipelineState.overallProgress}
                  currentStage={pipelineState.currentStage}
                  compact
                />
              </div>
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
      )}

      {viewMode === 'pipeline' && currentJobId && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Pipeline Visualization - Takes 3 columns */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6">
                Processing Pipeline
              </h3>
              <PipelineVisualization 
                stages={pipelineState.stages}
              />
            </div>
          </div>

          {/* Pipeline Status & Details - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <PipelineStatus 
                stages={pipelineState.stages}
                overallProgress={pipelineState.overallProgress}
                currentStage={pipelineState.currentStage}
              />
            </div>

            {/* Live Statistics */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Live Statistics
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Log Entries</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {logStream.totalLogs}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Errors</span>
                  <span className="text-sm font-semibold text-red-600">
                    {logStream.errorCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Warnings</span>
                  <span className="text-sm font-semibold text-yellow-600">
                    {logStream.warningCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Success</span>
                  <span className="text-sm font-semibold text-green-600">
                    {logStream.successCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'logs' && currentJobId && (
        <div>
          <LogStreamTerminal
            logs={logStream.logs}
            isRunning={logStream.isRunning}
            currentStage={logStream.currentStage}
            onClear={logStream.clearLogs}
          />
        </div>
      )}

      {/* No Job Selected State */}
      {!currentJobId && viewMode !== 'overview' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
          <Activity className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
            No Active Job
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            Upload a research paper to start the processing pipeline and view real-time updates.
          </p>
        </div>
      )}
    </div>
  )
}