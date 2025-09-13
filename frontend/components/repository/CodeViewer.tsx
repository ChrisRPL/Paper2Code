'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'

const SyntaxHighlighter = dynamic(
  () => import('react-syntax-highlighter').then(mod => mod.Prism),
  { 
    ssr: false,
    loading: () => <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse">Loading syntax highlighter...</div>
  }
)
import {
  Copy,
  Check,
  Download,
  Maximize2,
  Minimize2,
  Eye,
  FileText,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FileNode } from './FileTreeView'

interface CodeViewerProps {
  file: FileNode | null
  content?: string
  loading?: boolean
  className?: string
  onDownloadFile?: (file: FileNode) => void
}

export function CodeViewer({ 
  file, 
  content,
  loading = false,
  className,
  onDownloadFile
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [lineNumbers, setLineNumbers] = useState(true)
  const [isDark, setIsDark] = useState(false)
  const [wrapLines, setWrapLines] = useState(false)
  const [styles, setStyles] = useState<any>(null)

  // Load styles and detect theme
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const loadStyles = async () => {
      const stylesModule = await import('react-syntax-highlighter/dist/esm/styles/prism')
      setStyles({ oneDark: stylesModule.oneDark, oneLight: stylesModule.oneLight })
    }
    
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    
    loadStyles()
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    return () => observer.disconnect()
  }, [])

  const getLanguage = useMemo(() => {
    if (!file) return 'text'
    
    const ext = file.extension?.toLowerCase()
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'html': 'markup',
      'xml': 'markup',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'md': 'markdown',
      'sh': 'bash',
      'bash': 'bash',
      'zsh': 'bash',
      'sql': 'sql',
      'dockerfile': 'docker',
      'gitignore': 'gitignore',
      'env': 'bash',
      'config': 'ini',
      'ini': 'ini',
      'conf': 'nginx',
      'log': 'log'
    }
    
    return languageMap[ext || ''] || 'text'
  }, [file])

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  const copyToClipboard = async () => {
    if (content) {
      try {
        await navigator.clipboard.writeText(content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        console.error('Failed to copy:', error)
      }
    }
  }

  const downloadFile = () => {
    if (file && content) {
      const blob = new Blob([content], { type: 'text/plain' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      onDownloadFile?.(file)
    }
  }

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen)
  }

  if (!file) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center h-full bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700',
        className
      )}>
        <Eye className="w-12 h-12 text-slate-400 mb-4" />
        <p className="text-slate-600 dark:text-slate-400 text-center">
          Select a file to view its contents
        </p>
      </div>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          'flex flex-col bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden',
          fullscreen && 'fixed inset-4 z-50 shadow-2xl',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-slate-500" />
            <div>
              <h3 className="font-medium text-slate-900 dark:text-slate-100">
                {file.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {getLanguage} • {formatFileSize(file.size)} • {file.path}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Settings */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setLineNumbers(!lineNumbers)}
                className={cn(
                  'px-2 py-1 text-xs rounded transition-colors',
                  lineNumbers 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                )}
              >
                #
              </button>
              
              <button
                onClick={() => setWrapLines(!wrapLines)}
                className={cn(
                  'px-2 py-1 text-xs rounded transition-colors',
                  wrapLines 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                )}
              >
                Wrap
              </button>
            </div>
            
            {/* Action Buttons */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={copyToClipboard}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-slate-500" />
              )}
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={downloadFile}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Download file"
            >
              <Download className="w-4 h-4 text-slate-500" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {fullscreen ? (
                <Minimize2 className="w-4 h-4 text-slate-500" />
              ) : (
                <Maximize2 className="w-4 h-4 text-slate-500" />
              )}
            </motion.button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto relative">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center space-x-2 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading file contents...</span>
              </div>
            </div>
          ) : content ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              {styles ? (
                <SyntaxHighlighter
                  language={getLanguage}
                  style={isDark ? styles.oneDark : styles.oneLight}
                  showLineNumbers={lineNumbers}
                  wrapLines={wrapLines}
                  customStyle={{
                    margin: 0,
                    padding: '1rem',
                    background: 'transparent',
                    fontSize: '14px',
                    lineHeight: '1.5'
                  }}
                  lineNumberStyle={{
                    minWidth: '3em',
                    paddingRight: '1em',
                    color: isDark ? '#4B5563' : '#9CA3AF',
                    userSelect: 'none'
                  }}
                  codeTagProps={{
                    style: {
                      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                    }
                  }}
                >
                  {content}
                </SyntaxHighlighter>
              ) : (
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse">
                  Loading syntax highlighter...
                </div>
              )}
            </motion.div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-500 dark:text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-2" />
                <p>Unable to load file contents</p>
                <p className="text-xs">The file might be binary or too large</p>
              </div>
            </div>
          )}
        </div>

        {/* Status Bar */}
        {content && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500">
            <div className="flex items-center space-x-4">
              <span>Language: {getLanguage}</span>
              <span>Lines: {content.split('\n').length}</span>
              <span>Characters: {content.length}</span>
            </div>
            <div className="flex items-center space-x-2">
              {copied && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="text-green-600 dark:text-green-400"
                >
                  Copied!
                </motion.span>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}