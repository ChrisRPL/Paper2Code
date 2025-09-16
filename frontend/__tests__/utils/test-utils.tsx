import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock providers for testing
const MockProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div data-testid="mock-providers">{children}</div>
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, { wrapper: MockProviders, ...options })
}

// Test utilities
export const createMockWebSocket = () => {
  const mockWS = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
    readyState: WebSocket.OPEN,
    url: 'ws://localhost:8000/ws/test',
    protocol: '',
    bufferedAmount: 0,
    extensions: '',
    binaryType: 'blob' as BinaryType,
    dispatchEvent: jest.fn(),
    onopen: null,
    onclose: null,
    onmessage: null,
    onerror: null,
    CONNECTING: WebSocket.CONNECTING,
    OPEN: WebSocket.OPEN,
    CLOSING: WebSocket.CLOSING,
    CLOSED: WebSocket.CLOSED,
  }
  return mockWS
}

export const createMockFile = (
  name = 'test.pdf',
  size = 1024,
  type = 'application/pdf',
  content = 'mock file content'
) => {
  const file = new File([content], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

export const createMockDragEvent = (files: File[] = []) => {
  const mockDataTransfer = {
    files: {
      ...files,
      length: files.length,
      item: (index: number) => files[index],
      [Symbol.iterator]: function* () {
        for (const file of files) {
          yield file
        }
      },
    },
    getData: jest.fn(),
    setData: jest.fn(),
    clearData: jest.fn(),
    dropEffect: 'none' as DataTransfer['dropEffect'],
    effectAllowed: 'all' as DataTransfer['effectAllowed'],
    items: [] as any,
    types: [],
  }

  return {
    dataTransfer: mockDataTransfer,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
  }
}

export const mockJobData = {
  id: 'test-job-123',
  paper_name: 'Test Paper',
  status: 'pending' as const,
  progress: 0,
  current_stage: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  pdf_path: '/uploads/test.pdf',
  repository_path: null,
  processing_logs: [],
  error_message: null,
  completed_at: null,
}

export const mockJobProgressData = {
  type: 'job_progress',
  payload: {
    job_id: 'test-job-123',
    stage: 'planning',
    progress: 50,
    message: 'Processing planning stage...',
  },
}

export const mockChatMessage = {
  id: 'msg-123',
  type: 'user' as const,
  content: 'Hello, please process this paper',
  timestamp: '2024-01-01T00:00:00Z',
  jobId: 'test-job-123',
}

export const waitForLoadingToFinish = () => {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

// Re-export everything
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
export { customRender as render }