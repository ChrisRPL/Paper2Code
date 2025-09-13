// Chat message types
export interface Message {
  id: string
  content: string
  type: 'user' | 'agent' | 'system' | 'success' | 'error'
  timestamp: Date
  jobId?: string
}

// Job processing types  
export interface Job {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  stage?: 'planning' | 'analysis' | 'coding'
  progress: number
  filename?: string
  createdAt: Date
  completedAt?: Date
  repositoryPath?: string
  error?: string
}

// Agent status types
export interface AgentStatus {
  agent: 'planning' | 'analysis' | 'coding'
  status: 'idle' | 'processing' | 'completed'
  progress: number
  currentTask?: string
  artifacts?: any[]
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'job:started' | 'job:stage_update' | 'job:artifact' | 'job:completed' | 'job:error' | 'chat:message' | 'agent:status'
  payload: any
  timestamp: Date
}