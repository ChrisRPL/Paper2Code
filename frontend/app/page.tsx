'use client'

import { useState } from 'react'
import { FileUpload } from '@/components/upload/FileUpload'
import { ChatContainer } from '@/components/chat'
import { JobDashboard } from '@/components/jobs'
import { RepositoryBrowser, type FileNode } from '@/components/repository'
import { Brain, Github, ArrowRight, MessageCircle, Activity, Folder } from 'lucide-react'

export default function Home() {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'upload' | 'dashboard' | 'chat' | 'repository'>('upload')

  const handleUploadComplete = (jobId: string, filename: string) => {
    setCurrentJobId(jobId)
    console.log('Upload completed:', { jobId, filename })
    // Switch to dashboard view after upload
    setActiveTab('dashboard')
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 mb-8 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-1 border border-slate-200/60 dark:border-slate-700/60">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              activeTab === 'upload'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>Upload</span>
          </button>
          
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              activeTab === 'dashboard'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              activeTab === 'chat'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>Chat</span>
          </button>
          
          <button
            onClick={() => setActiveTab('repository')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              activeTab === 'repository'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>Repository</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'upload' && (
          <div>
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
          </div>
        )}

        {activeTab === 'dashboard' && (
          <JobDashboard />
        )}

        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden h-[600px]">
              <ChatContainer showWelcome={true} />
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
                Processing Information
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                    How It Works
                  </h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Upload a research paper in PDF format</li>
                    <li>• Our AI agents analyze the content</li>
                    <li>• Code is generated progressively</li>
                    <li>• Download the complete repository</li>
                  </ul>
                </div>
                
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                    Supported Papers
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Best results with ML/AI research papers containing algorithms, 
                    mathematical methods, and implementation details.
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                    Processing Time
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Typical processing takes 10-20 minutes depending on paper complexity.
                    Real-time updates will show progress throughout.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'repository' && currentJobId && (
          <div className="h-[800px]">
            <RepositoryBrowser
              jobId={currentJobId}
              files={[]}
              onFileSelect={(file) => console.log('Selected file:', file)}
            />
          </div>
        )}

        {activeTab === 'repository' && !currentJobId && (
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <Folder className="w-16 h-16 text-slate-400 mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
              No Repository Available
            </h3>
            <p className="text-slate-600 dark:text-slate-400 max-w-md">
              Upload and process a research paper to generate a code repository that you can explore and download.
            </p>
            <button
              onClick={() => setActiveTab('upload')}
              className="mt-6 flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <Brain className="w-5 h-5" />
              <span>Upload Paper</span>
            </button>
          </div>
        )}
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
