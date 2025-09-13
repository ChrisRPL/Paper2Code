'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  Image,
  Terminal,
  Settings,
  Package,
  GitBranch
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FileNode {
  id: string
  name: string
  type: 'file' | 'folder'
  path: string
  children?: FileNode[]
  size?: number
  extension?: string
}

interface FileTreeViewProps {
  files: FileNode[]
  selectedFile?: string
  onFileSelect?: (file: FileNode) => void
  className?: string
  searchQuery?: string
}

export function FileTreeView({ 
  files, 
  selectedFile,
  onFileSelect,
  className,
  searchQuery = ''
}: FileTreeViewProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [hoveredFile, setHoveredFile] = useState<string | null>(null)

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }, [])

  const getFileIcon = useCallback((node: FileNode) => {
    if (node.type === 'folder') {
      const isExpanded = expandedFolders.has(node.id)
      return isExpanded ? (
        <FolderOpen className="w-4 h-4 text-blue-500" />
      ) : (
        <Folder className="w-4 h-4 text-blue-500" />
      )
    }

    // File icons based on extension
    const ext = node.extension?.toLowerCase()
    switch (ext) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return <FileCode className="w-4 h-4 text-yellow-500" />
      case 'py':
        return <FileCode className="w-4 h-4 text-blue-400" />
      case 'json':
        return <FileJson className="w-4 h-4 text-orange-500" />
      case 'md':
      case 'txt':
        return <FileText className="w-4 h-4 text-slate-400" />
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return <Image className="w-4 h-4 text-purple-500" />
      case 'sh':
      case 'bash':
        return <Terminal className="w-4 h-4 text-green-500" />
      case 'yaml':
      case 'yml':
      case 'toml':
        return <Settings className="w-4 h-4 text-pink-500" />
      case 'package.json':
        return <Package className="w-4 h-4 text-red-500" />
      case 'gitignore':
        return <GitBranch className="w-4 h-4 text-orange-600" />
      default:
        return <File className="w-4 h-4 text-slate-400" />
    }
  }, [expandedFolders])

  const formatFileSize = useCallback((bytes?: number) => {
    if (!bytes) return ''
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }, [])

  const filterFiles = useCallback((nodes: FileNode[], query: string): FileNode[] => {
    if (!query) return nodes
    
    return nodes.reduce((acc: FileNode[], node) => {
      const matchesQuery = node.name.toLowerCase().includes(query.toLowerCase())
      
      if (node.type === 'folder' && node.children) {
        const filteredChildren = filterFiles(node.children, query)
        if (filteredChildren.length > 0 || matchesQuery) {
          acc.push({
            ...node,
            children: filteredChildren
          })
          // Auto-expand folders with matches
          setExpandedFolders(prev => new Set([...prev, node.id]))
        }
      } else if (matchesQuery) {
        acc.push(node)
      }
      
      return acc
    }, [])
  }, [])

  const renderTree = useCallback((nodes: FileNode[], level = 0): React.ReactNode => {
    const filteredNodes = searchQuery ? filterFiles(nodes, searchQuery) : nodes
    
    return filteredNodes.map((node) => {
      const isExpanded = expandedFolders.has(node.id)
      const isSelected = selectedFile === node.id
      const isHovered = hoveredFile === node.id
      const isFolder = node.type === 'folder'
      
      return (
        <div key={node.id}>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'group flex items-center px-2 py-1 rounded-md cursor-pointer transition-all duration-150',
              isSelected && 'bg-blue-100 dark:bg-blue-900/30',
              !isSelected && isHovered && 'bg-slate-100 dark:bg-slate-800',
              !isSelected && !isHovered && 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
            )}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={() => {
              if (isFolder) {
                toggleFolder(node.id)
              } else if (onFileSelect) {
                onFileSelect(node)
              }
            }}
            onMouseEnter={() => setHoveredFile(node.id)}
            onMouseLeave={() => setHoveredFile(null)}
          >
            {/* Expand/Collapse Icon */}
            {isFolder && (
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
                className="mr-1"
              >
                <ChevronRight className="w-3 h-3 text-slate-400" />
              </motion.div>
            )}
            
            {!isFolder && <div className="w-4 mr-1" />}
            
            {/* File/Folder Icon */}
            <div className="mr-2 flex-shrink-0">
              {getFileIcon(node)}
            </div>
            
            {/* File/Folder Name */}
            <span className={cn(
              'flex-1 text-sm truncate',
              isSelected ? 'font-medium text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300',
              searchQuery && node.name.toLowerCase().includes(searchQuery.toLowerCase()) && 'font-medium'
            )}>
              {node.name}
            </span>
            
            {/* File Size */}
            {!isFolder && node.size && (
              <span className="text-xs text-slate-400 dark:text-slate-500 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {formatFileSize(node.size)}
              </span>
            )}
          </motion.div>
          
          {/* Render Children */}
          <AnimatePresence>
            {isFolder && isExpanded && node.children && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {renderTree(node.children, level + 1)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )
    })
  }, [expandedFolders, selectedFile, hoveredFile, searchQuery, filterFiles, getFileIcon, formatFileSize, toggleFolder, onFileSelect])

  return (
    <div className={cn('overflow-auto', className)}>
      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500">
          <Folder className="w-12 h-12 mb-2" />
          <p className="text-sm">No files to display</p>
        </div>
      ) : (
        <div className="py-2">
          {renderTree(files)}
        </div>
      )}
    </div>
  )
}