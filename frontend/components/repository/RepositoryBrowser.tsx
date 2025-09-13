'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Folder,
  FileText,
  Download,
  RotateCcw,
  Filter,
  Grid,
  List,
  Eye,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'
import { FileTreeView, type FileNode } from './FileTreeView'
import { DownloadManager } from './DownloadManager'

const CodeViewer = dynamic(() => import('./CodeViewer').then(mod => ({ default: mod.CodeViewer })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  )
})

interface RepositoryBrowserProps {
  jobId: string
  repositoryName?: string
  files: FileNode[]
  className?: string
  onFileSelect?: (file: FileNode) => void
}


export function RepositoryBrowser({
  jobId,
  repositoryName = 'Generated Repository',
  files,
  className,
  onFileSelect
}: RepositoryBrowserProps) {
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'split' | 'tree' | 'preview'>('split')
  const [showDownloadPanel, setShowDownloadPanel] = useState(false)

  // Calculate repository stats
  const repoStats = useMemo(() => {
    const countFiles = (nodes: FileNode[]): { files: number; folders: number; totalSize: number } => {
      let files = 0
      let folders = 0
      let totalSize = 0
      
      for (const node of nodes) {
        if (node.type === 'file') {
          files++
          totalSize += node.size || 0
        } else {
          folders++
          if (node.children) {
            const childStats = countFiles(node.children)
            files += childStats.files
            folders += childStats.folders
            totalSize += childStats.totalSize
          }
        }
      }
      
      return { files, folders, totalSize }
    }
    
    return countFiles(files)
  }, [files])

  const handleFileSelect = useCallback(async (file: FileNode) => {
    if (file.type === 'file') {
      setSelectedFile(file)
      setLoading(true)
      
      try {
        // Fetch actual file content from API
        const response = await fetch(`/api/v1/jobs/${jobId}/files/${encodeURIComponent(file.path)}`)
        if (response.ok) {
          const content = await response.text()
          setFileContent(content)
        } else {
          setFileContent(`// Error loading ${file.name}\n// File not found or access denied`)
        }
      } catch (error) {
        setFileContent(`// Error loading ${file.name}\n// ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
      
      onFileSelect?.(file)
    }
  }, [jobId, onFileSelect])

  const clearSelection = useCallback(() => {
    setSelectedFile(null)
    setFileContent('')
  }, [])

  const toggleDownloadPanel = useCallback(() => {
    setShowDownloadPanel(!showDownloadPanel)
  }, [showDownloadPanel])

  return (
    <div className={cn('flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex items-center space-x-3">
          <Folder className="w-6 h-6 text-blue-500" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {repositoryName}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {repoStats.files} files • {repoStats.folders} folders • 
              {repoStats.totalSize > 0 && ` ${(repoStats.totalSize / 1024).toFixed(1)} KB`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="flex bg-slate-200 dark:bg-slate-700 rounded-lg p-1">
            {(['tree', 'split', 'preview'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize',
                  viewMode === mode
                    ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                )}
              >
                {mode}
              </button>
            ))}
          </div>
          
          {/* Download Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleDownloadPanel}
            className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </motion.button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition-colors"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Tree */}
        {(viewMode === 'tree' || viewMode === 'split') && (
          <div className={cn(
            'border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30',
            viewMode === 'tree' ? 'flex-1' : 'w-80 flex-shrink-0'
          )}>
            <div className="h-full overflow-auto">
              <FileTreeView
                files={files}
                selectedFile={selectedFile?.id}
                onFileSelect={handleFileSelect}
                searchQuery={searchQuery}
              />
            </div>
          </div>
        )}

        {/* Code Preview */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className="flex-1 flex flex-col">
            {selectedFile && (
              <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {selectedFile.name}
                  </span>
                </div>
                
                <button
                  onClick={clearSelection}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            )}
            
            <div className="flex-1">
              <CodeViewer
                file={selectedFile}
                content={fileContent}
                loading={loading}
                onDownloadFile={(file) => console.log('Download file:', file.name)}
                className="h-full border-none rounded-none"
              />
            </div>
          </div>
        )}

        {/* No preview state */}
        {viewMode === 'tree' && (
          <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900/30">
            <div className="text-center text-slate-500 dark:text-slate-400">
              <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Select a file to preview</p>
              <p className="text-xs mt-1">Double-click files in the tree view</p>
            </div>
          </div>
        )}
      </div>

      {/* Download Panel */}
      <AnimatePresence>
        {showDownloadPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 overflow-hidden"
          >
            <div className="p-4">
              <DownloadManager
                jobId={jobId}
                repositoryName={repositoryName}
                totalFiles={repoStats.files}
                totalSize={repoStats.totalSize}
                onDownloadStart={() => console.log('Download started')}
                onDownloadComplete={(success) => {
                  console.log('Download completed:', success)
                  if (success) {
                    setTimeout(() => setShowDownloadPanel(false), 2000)
                  }
                }}
                className="bg-transparent border-none shadow-none"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}