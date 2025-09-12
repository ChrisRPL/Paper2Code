'use client'

import { useState } from 'react'
import { FileUpload } from '@/components/upload/FileUpload'
import { Brain, Github, ArrowRight } from 'lucide-react'

export default function Home() {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)

  const handleUploadComplete = (jobId: string, filename: string) => {
    setCurrentJobId(jobId)
    console.log('Upload completed:', { jobId, filename })
    // TODO: Navigate to processing view or update UI to show progress
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur opacity-25"></div>
                <div className="relative bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Brain className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Paper2Code
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Transform research into code
                </p>
              </div>
            </div>
            
            <a
              href="https://github.com/Paper2Code-AI/Paper2Code"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 rounded-lg transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm font-medium mb-6">
            <Brain className="w-4 h-4 mr-2" />
            AI-Powered Research Assistant
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-slate-100 mb-6 tracking-tight">
            From Research Papers
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              To Working Code
            </span>
          </h1>
          
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Upload any research paper and watch our AI agents transform complex algorithms and methods 
            into clean, executable code repositories. No more manual implementation struggles.
          </p>
        </div>

        {/* Upload Section */}
        <div className="mb-16">
          <FileUpload 
            onUploadComplete={handleUploadComplete}
            disabled={false}
          />
        </div>

        {/* Process Steps */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <div className="relative mx-auto mb-4 w-16 h-16">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full opacity-20 blur"></div>
              <div className="relative bg-white dark:bg-slate-800 rounded-full p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">1</span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Planning Agent
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Analyzes your paper and creates a comprehensive implementation strategy
            </p>
          </div>
          
          <div className="text-center">
            <div className="relative mx-auto mb-4 w-16 h-16">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full opacity-20 blur"></div>
              <div className="relative bg-white dark:bg-slate-800 rounded-full p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">2</span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Analysis Agent
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Deep-dives into technical details and identifies key algorithms
            </p>
          </div>
          
          <div className="text-center">
            <div className="relative mx-auto mb-4 w-16 h-16">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full opacity-20 blur"></div>
              <div className="relative bg-white dark:bg-slate-800 rounded-full p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">3</span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Coding Agent
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Generates clean, documented code with proper project structure
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8">
            Why Choose Paper2Code?
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Multi-Agent System', desc: 'Specialized AI agents for each implementation phase' },
              { title: 'Real-time Progress', desc: 'Watch your code being generated step by step' },
              { title: 'Production Ready', desc: 'Clean, documented code with proper structure' },
              { title: 'Open Source', desc: 'Full transparency and community-driven development' },
            ].map((feature, index) => (
              <div 
                key={index}
                className="p-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-200/60 dark:border-slate-700/60 hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 dark:border-slate-700/60 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
              <Brain className="w-4 h-4" />
              <span>Paper2Code - Powered by AI Research</span>
            </div>
            
            <div className="flex items-center space-x-4 text-sm">
              <a 
                href="#"
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                About
              </a>
              <a 
                href="#"
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                Documentation
              </a>
              <a 
                href="https://github.com/Paper2Code-AI/Paper2Code"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                <span>View on GitHub</span>
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
