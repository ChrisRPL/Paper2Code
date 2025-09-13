'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, X, AlertCircle, CheckCircle, Sparkles, Loader2, Wifi, WifiOff } from 'lucide-react'
import { useChatStore } from '@/store/index'
import { useWebSocket } from '@/hooks/useWebSocket'

interface FileUploadProps {
  onUploadComplete?: (jobId: string, filename: string) => void
  disabled?: boolean
}

export function FileUpload({ onUploadComplete, disabled = false }: FileUploadProps) {
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)
  
  const { currentUpload, setCurrentUpload } = useChatStore()
  const { isConnected, subscribeToJob } = useWebSocket()

  const handleFiles = useCallback(async (files: FileList) => {
    if (files.length === 0) return
    
    const file = files[0]
    
    // Validate file type and size
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file only.')
      return
    }
    
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      setError('File size must be less than 50MB.')
      return
    }

    setError(null)
    setCurrentUpload(file)
    setUploading(true)
    setUploadProgress(0)
    setUploadComplete(false)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Simulate progress
      let progress = 0
      const progressInterval = setInterval(() => {
        progress += Math.random() * 15
        setUploadProgress(Math.min(progress, 95))
      }, 200)

      const response = await fetch('/api/v1/upload/', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Upload failed')
      }

      const result = await response.json()
      setUploadProgress(100)
      setUploadComplete(true)
      
      // Subscribe to job updates via WebSocket
      if (isConnected) {
        subscribeToJob(result.job_id)
      }
      
      // Call completion callback
      onUploadComplete?.(result.job_id, result.filename)
      
      // Add success message to chat
      useChatStore.getState().addMessage({
        content: `"${file.name}" uploaded successfully! ${isConnected ? 'Real-time processing updates enabled.' : 'Processing will begin shortly...'}`,
        type: 'success'
      })

      // Auto-clear after success
      setTimeout(() => {
        setCurrentUpload(undefined)
        setUploadProgress(0)
        setUploadComplete(false)
      }, 3000)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed'
      setError(errorMessage)
      setCurrentUpload(undefined)
      
      // Add error message to chat
      useChatStore.getState().addMessage({
        content: `Upload failed: ${errorMessage}`,
        type: 'error'
      })
    } finally {
      setUploading(false)
    }
  }, [onUploadComplete, setCurrentUpload])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = () => setIsDragging(false)

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files)
  }

  const removeFile = () => {
    setCurrentUpload(undefined)
    setError(null)
    setUploadProgress(0)
    setUploadComplete(false)
  }

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Main Upload Area */}
      {!currentUpload ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <motion.div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => document.getElementById('file-input')?.click()}
            className={`relative rounded-2xl p-12 text-center cursor-pointer bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-900/50 dark:to-blue-900/20 border-2 border-dashed transition-all duration-300 group overflow-hidden
              ${isDragging 
                ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/30 scale-[1.02] shadow-xl' 
                : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-indigo-50/30 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/20'
              }
              ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:shadow-lg'}
            `}
            whileHover={!disabled ? { y: -2 } : {}}
            whileTap={!disabled ? { scale: 0.98 } : {}}
          >
            <input
              id="file-input"
              type="file"
              accept=".pdf,application/pdf"
              onChange={onFileSelect}
              className="hidden"
              disabled={disabled}
            />

            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-5 dark:opacity-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,_theme(colors.blue.500)_0%,_transparent_25%)] animate-pulse" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,_theme(colors.indigo.500)_0%,_transparent_25%)] animate-pulse [animation-delay:1s]" />
            </div>

            <motion.div
              animate={isDragging ? { 
                y: [-5, 0, -5],
                rotate: [-2, 2, -2] 
              } : {}}
              transition={{ 
                duration: 1.5, 
                repeat: isDragging ? Infinity : 0,
                ease: "easeInOut" 
              }}
              className="relative z-10"
            >
              {/* Icon with gradient background */}
              <div className="relative mx-auto mb-6">
                <motion.div 
                  className="absolute -inset-4 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-full blur-lg"
                  animate={isDragging ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 2, repeat: isDragging ? Infinity : 0 }}
                />
                <div className="relative bg-white dark:bg-slate-800 rounded-full p-6 shadow-lg border border-slate-200 dark:border-slate-600">
                  <motion.div
                    animate={isDragging ? { rotate: 360 } : {}}
                    transition={{ duration: 2, repeat: isDragging ? Infinity : 0, ease: "linear" }}
                  >
                    <Sparkles className="w-12 h-12 text-blue-500 dark:text-blue-400" />
                  </motion.div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {isDragging ? 'Drop your research paper!' : 'Transform Research to Code'}
                </h3>
                
                <div className="space-y-2">
                  <p className="text-lg text-slate-600 dark:text-slate-300">
                    {isDragging ? (
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        Release to start the magic ✨
                      </span>
                    ) : (
                      <>
                        Drop your <span className="font-semibold text-blue-600 dark:text-blue-400">PDF paper</span> here
                      </>
                    )}
                  </p>
                  
                  {!isDragging && (
                    <p className="text-slate-500 dark:text-slate-400">
                      or <span className="font-medium text-blue-600 dark:text-blue-400 underline decoration-dotted">click to browse</span> your files
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-center space-x-6 text-sm text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                  <span className="flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>PDF only</span>
                  </span>
                  <span>•</span>
                  <span>Max 50MB</span>
                  <span>•</span>
                  <span className="flex items-center space-x-1.5">
                    {isConnected ? (
                      <>
                        <Wifi className="w-4 h-4 text-green-500" />
                        <span className="text-green-600 dark:text-green-400">Real-time ready</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-4 h-4 text-amber-500" />
                        <span className="text-amber-600 dark:text-amber-400">Connecting...</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      ) : (
        /* File Preview & Upload Progress */
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start space-x-4">
                {/* File Icon */}
                <div className="flex-shrink-0 relative">
                  <div className="w-16 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-md">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                  
                  {uploadComplete && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1 shadow-md"
                    >
                      <CheckCircle className="w-4 h-4 text-white" />
                    </motion.div>
                  )}
                </div>

                {/* File Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {currentUpload.name}
                      </h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {formatFileSize(currentUpload.size)} • PDF Document
                      </p>
                    </div>

                    {!uploading && !uploadComplete && (
                      <button
                        onClick={removeFile}
                        className="ml-4 p-1.5 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Progress Section */}
                  <div className="mt-4 space-y-3">
                    {uploading && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                            <span className="text-slate-600 dark:text-slate-300">
                              Uploading your paper...
                            </span>
                          </div>
                          <span className="font-medium text-slate-700 dark:text-slate-200">
                            {Math.round(uploadProgress)}%
                          </span>
                        </div>
                        
                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-sm"
                          />
                        </div>
                      </div>
                    )}

                    {uploadComplete && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center space-x-2 text-green-600 dark:text-green-400"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Upload complete! Starting AI processing...
                        </span>
                      </motion.div>
                    )}

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                      >
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}