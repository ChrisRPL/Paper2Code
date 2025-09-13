'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  Package,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileArchive,
  Folder,
  File,
  X,
  Play,
  Settings,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DownloadOptions {
  format: 'zip' | 'tar' | 'folder'
  includeHidden: boolean
  compressionLevel: 1 | 2 | 3 | 4 | 5
  excludePatterns: string[]
}

interface DownloadProgress {
  current: number
  total: number
  currentFile?: string
  status: 'preparing' | 'downloading' | 'compressing' | 'completed' | 'error'
}

interface DownloadManagerProps {
  jobId: string
  repositoryName?: string
  totalFiles?: number
  totalSize?: number
  onDownloadStart?: () => void
  onDownloadComplete?: (success: boolean) => void
  className?: string
}

export function DownloadManager({
  jobId,
  repositoryName = 'Repository',
  totalFiles = 0,
  totalSize = 0,
  onDownloadStart,
  onDownloadComplete,
  className
}: DownloadManagerProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [options, setOptions] = useState<DownloadOptions>({
    format: 'zip',
    includeHidden: false,
    compressionLevel: 3,
    excludePatterns: ['node_modules', '.git', '__pycache__', '*.pyc', '.DS_Store']
  })
  const [showOptions, setShowOptions] = useState(false)

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 B'
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }, [])

  const simulateProgress = useCallback((
    onProgress: (progress: DownloadProgress) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ) => {
    let current = 0
    const total = totalFiles || 50
    
    const updateProgress = () => {
      if (current < total * 0.3) {
        // Preparing phase
        onProgress({
          current,
          total,
          currentFile: 'Preparing files...',
          status: 'preparing'
        })
      } else if (current < total * 0.7) {
        // Downloading phase
        onProgress({
          current,
          total,
          currentFile: `Processing file ${current}/${total}...`,
          status: 'downloading'
        })
      } else if (current < total) {
        // Compressing phase
        onProgress({
          current,
          total,
          currentFile: 'Compressing files...',
          status: 'compressing'
        })
      } else {
        // Completed
        onProgress({
          current: total,
          total,
          status: 'completed'
        })
        onComplete()
        return
      }
      
      current += Math.floor(Math.random() * 3) + 1
      setTimeout(updateProgress, 100 + Math.random() * 200)
    }
    
    updateProgress()
  }, [totalFiles])

  const startDownload = useCallback(async () => {
    setIsDownloading(true)
    setError(null)
    setProgress(null)
    setDownloadUrl(null)
    onDownloadStart?.()

    try {
      // Start progress simulation
      simulateProgress(
        setProgress,
        async () => {
          // Simulate actual API call
          try {
            const response = await fetch(`/api/v1/jobs/${jobId}/download`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              }
            })

            if (!response.ok) {
              throw new Error('Download failed')
            }

            // Create blob and download
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const filename = `${repositoryName.replace(/\s+/g, '_')}_${jobId.slice(0, 8)}.${options.format}`
            
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            
            window.URL.revokeObjectURL(url)
            setDownloadUrl(url)
            setIsDownloading(false)
            onDownloadComplete?.(true)
          } catch (err) {
            throw new Error('Failed to download repository')
          }
        },
        (errorMsg) => {
          setError(errorMsg)
          setIsDownloading(false)
          onDownloadComplete?.(false)
        }
      )
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed'
      setError(errorMessage)
      setIsDownloading(false)
      onDownloadComplete?.(false)
    }
  }, [jobId, repositoryName, options, simulateProgress, onDownloadStart, onDownloadComplete])

  const cancelDownload = useCallback(() => {
    setIsDownloading(false)
    setProgress(null)
    setError(null)
  }, [])

  const getStatusIcon = () => {
    if (error) return <AlertCircle className="w-5 h-5 text-red-500" />
    if (progress?.status === 'completed') return <CheckCircle className="w-5 h-5 text-green-500" />
    if (isDownloading) return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
    return <Package className="w-5 h-5 text-slate-500" />
  }

  const getStatusText = () => {
    if (error) return 'Download failed'
    if (progress?.status === 'completed') return 'Download completed'
    if (progress?.status === 'preparing') return 'Preparing download...'
    if (progress?.status === 'downloading') return 'Downloading files...'
    if (progress?.status === 'compressing') return 'Compressing archive...'
    return 'Ready to download'
  }

  return (
    <div className={cn('bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className="font-medium text-slate-900 dark:text-slate-100">
              Repository Download
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {getStatusText()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowOptions(!showOptions)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Download options"
          >
            <Settings className="w-4 h-4 text-slate-500" />
          </motion.button>
        </div>
      </div>

      {/* Download Options */}
      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-slate-200 dark:border-slate-700"
          >
            <div className="p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
              {/* Format Selection */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Format
                </label>
                <div className="flex space-x-2">
                  {(['zip', 'tar'] as const).map((format) => (
                    <button
                      key={format}
                      onClick={() => setOptions(prev => ({ ...prev, format }))}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                        options.format === format
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                      )}
                    >
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Compression Level */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Compression Level: {options.compressionLevel}
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={options.compressionLevel}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    compressionLevel: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5
                  }))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Fast</span>
                  <span>Best</span>
                </div>
              </div>

              {/* Include Hidden Files */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700 dark:text-slate-300">Include hidden files</span>
                <button
                  onClick={() => setOptions(prev => ({ ...prev, includeHidden: !prev.includeHidden }))}
                  className={cn(
                    'w-10 h-5 rounded-full transition-colors relative',
                    options.includeHidden ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5',
                    options.includeHidden ? 'translate-x-5' : 'translate-x-0.5'
                  )} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Repository Info */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">Repository</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">{repositoryName}</span>
        </div>
        
        {totalFiles > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Files</span>
            <span className="text-slate-700 dark:text-slate-300">{totalFiles.toLocaleString()}</span>
          </div>
        )}
        
        {totalSize > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Size</span>
            <span className="text-slate-700 dark:text-slate-300">{formatFileSize(totalSize)}</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <AnimatePresence>
        {progress && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    {progress.currentFile || 'Processing...'}
                  </span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {Math.round((progress.current / progress.total) * 100)}%
                  </span>
                </div>
                
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Download Error
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
        {!isDownloading && progress?.status !== 'completed' ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startDownload}
            disabled={isDownloading}
            className="w-full flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-3 rounded-lg font-medium transition-colors"
          >
            <Download className="w-5 h-5" />
            <span>Download Repository</span>
          </motion.button>
        ) : isDownloading ? (
          <div className="flex space-x-2">
            <button
              onClick={cancelDownload}
              className="flex-1 flex items-center justify-center space-x-2 bg-slate-500 hover:bg-slate-600 text-white px-4 py-3 rounded-lg font-medium transition-colors"
            >
              <X className="w-5 h-5" />
              <span>Cancel</span>
            </button>
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startDownload}
            className="w-full flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-medium transition-colors"
          >
            <Download className="w-5 h-5" />
            <span>Download Again</span>
          </motion.button>
        )}
      </div>
    </div>
  )
}