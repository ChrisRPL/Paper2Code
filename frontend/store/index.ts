import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { Message, Job, AgentStatus } from '@/types'

// Chat store interface
interface ChatStore {
  messages: Message[]
  isTyping: boolean
  currentUpload?: File
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  setTyping: (isTyping: boolean) => void
  setCurrentUpload: (file?: File) => void
  clearMessages: () => void
}

// Job store interface
interface JobStore {
  activeJobs: Job[]
  jobHistory: Job[]
  currentJobId?: string
  agentStatus: AgentStatus[]
  addJob: (job: Omit<Job, 'id' | 'createdAt'>) => void
  updateJob: (jobId: string, updates: Partial<Job>) => void
  setCurrentJob: (jobId?: string) => void
  updateAgentStatus: (status: AgentStatus) => void
}

// UI store interface
interface UIStore {
  theme: 'light' | 'dark'
  activeView: 'chat' | 'workflow' | 'results'
  sidebarOpen: boolean
  toggleTheme: () => void
  setActiveView: (view: 'chat' | 'workflow' | 'results') => void
  setSidebarOpen: (open: boolean) => void
}

// WebSocket store interface
interface ConnectionStore {
  status: 'connected' | 'disconnected' | 'connecting'
  jobId?: string
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting') => void
  setJobId: (jobId?: string) => void
}

// Create stores
export const useChatStore = create<ChatStore>()(
  devtools(
    (set, get) => ({
      messages: [],
      isTyping: false,
      currentUpload: undefined,
      addMessage: (message) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              ...message,
              id: crypto.randomUUID(),
              timestamp: new Date(),
            },
          ],
        })),
      setTyping: (isTyping) => set({ isTyping }),
      setCurrentUpload: (file) => set({ currentUpload: file }),
      clearMessages: () => set({ messages: [] }),
    }),
    { name: 'chat-store' }
  )
)

export const useJobStore = create<JobStore>()(
  devtools(
    (set, get) => ({
      activeJobs: [],
      jobHistory: [],
      currentJobId: undefined,
      agentStatus: [],
      addJob: (job) =>
        set((state) => {
          const newJob = {
            ...job,
            id: crypto.randomUUID(),
            createdAt: new Date(),
          }
          return {
            activeJobs: [...state.activeJobs, newJob],
            currentJobId: newJob.id,
          }
        }),
      updateJob: (jobId, updates) =>
        set((state) => ({
          activeJobs: state.activeJobs.map((job) =>
            job.id === jobId ? { ...job, ...updates } : job
          ),
        })),
      setCurrentJob: (jobId) => set({ currentJobId: jobId }),
      updateAgentStatus: (status) =>
        set((state) => ({
          agentStatus: [
            ...state.agentStatus.filter((s) => s.agent !== status.agent),
            status,
          ],
        })),
    }),
    { name: 'job-store' }
  )
)

export const useUIStore = create<UIStore>()(
  devtools(
    (set) => ({
      theme: 'light',
      activeView: 'chat',
      sidebarOpen: true,
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setActiveView: (view) => set({ activeView: view }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    { name: 'ui-store' }
  )
)

export const useConnectionStore = create<ConnectionStore>()(
  devtools(
    (set) => ({
      status: 'disconnected',
      jobId: undefined,
      setConnectionStatus: (status) => set({ status }),
      setJobId: (jobId) => set({ jobId }),
    }),
    { name: 'connection-store' }
  )
)