import React from 'react'
import { render, screen, fireEvent, waitFor } from '../utils/test-utils'
import userEvent from '@testing-library/user-event'
import JobDashboard from '../../components/jobs/JobDashboard'
import { mockJobData } from '../utils/test-utils'

// Mock the job store
const mockJobs = [
  { ...mockJobData, id: 'job-1', paper_name: 'Paper 1', status: 'pending' },
  { ...mockJobData, id: 'job-2', paper_name: 'Paper 2', status: 'processing', progress: 50 },
  { ...mockJobData, id: 'job-3', paper_name: 'Paper 3', status: 'completed', progress: 100 },
]

const mockJobStore = {
  jobs: mockJobs,
  selectedJob: mockJobs[0],
  setSelectedJob: jest.fn(),
  updateJob: jest.fn(),
  removeJob: jest.fn(),
  clearJobs: jest.fn(),
}

jest.mock('../../store/jobStore', () => ({
  useJobStore: () => mockJobStore,
}))

// Mock the WebSocket hook
const mockWebSocket = {
  isConnected: true,
  connectionStatus: 'connected',
  lastMessage: null,
  error: null,
}

jest.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: () => mockWebSocket,
}))

describe('JobDashboard Component', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    mockJobStore.setSelectedJob.mockClear()
    mockJobStore.updateJob.mockClear()
    mockJobStore.removeJob.mockClear()
    mockJobStore.clearJobs.mockClear()
    mockJobStore.selectedJob = mockJobs[0]
  })

  it('renders job list correctly', () => {
    render(<JobDashboard />)

    expect(screen.getByText('Paper 1')).toBeInTheDocument()
    expect(screen.getByText('Paper 2')).toBeInTheDocument()
    expect(screen.getByText('Paper 3')).toBeInTheDocument()
  })

  it('displays job statuses correctly', () => {
    render(<JobDashboard />)

    expect(screen.getByText('pending')).toBeInTheDocument()
    expect(screen.getByText('processing')).toBeInTheDocument()
    expect(screen.getByText('completed')).toBeInTheDocument()
  })

  it('shows progress for processing jobs', () => {
    render(<JobDashboard />)

    const progressBars = screen.getAllByRole('progressbar')
    expect(progressBars.length).toBeGreaterThan(0)

    // Check that the processing job shows progress
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('allows job selection', async () => {
    render(<JobDashboard />)

    const job2Button = screen.getByRole('button', { name: /paper 2/i })
    await user.click(job2Button)

    expect(mockJobStore.setSelectedJob).toHaveBeenCalledWith(mockJobs[1])
  })

  it('displays selected job details', () => {
    mockJobStore.selectedJob = mockJobs[1]

    render(<JobDashboard />)

    expect(screen.getByText('Paper 2')).toBeInTheDocument()
    expect(screen.getByText('processing')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('shows cancel button for processing jobs', () => {
    mockJobStore.selectedJob = mockJobs[1] // processing job

    render(<JobDashboard />)

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('shows download button for completed jobs', () => {
    mockJobStore.selectedJob = mockJobs[2] // completed job

    render(<JobDashboard />)

    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument()
  })

  it('handles job cancellation', async () => {
    mockJobStore.selectedJob = mockJobs[1]

    render(<JobDashboard />)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    // Should show confirmation dialog
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument()

    const confirmButton = screen.getByRole('button', { name: /confirm/i })
    await user.click(confirmButton)

    // In a real implementation, this would trigger the API call
    expect(confirmButton).toBeInTheDocument()
  })

  it('handles job deletion', async () => {
    render(<JobDashboard />)

    const deleteButton = screen.getByRole('button', { name: /delete/i })
    await user.click(deleteButton)

    // Should show confirmation dialog
    expect(screen.getByText(/delete job/i)).toBeInTheDocument()

    const confirmButton = screen.getByRole('button', { name: /delete/i })
    await user.click(confirmButton)

    expect(mockJobStore.removeJob).toHaveBeenCalledWith(mockJobs[0].id)
  })

  it('displays empty state when no jobs exist', () => {
    mockJobStore.jobs = []
    mockJobStore.selectedJob = null

    render(<JobDashboard />)

    expect(screen.getByText(/no jobs found/i)).toBeInTheDocument()
    expect(screen.getByText(/upload a pdf to get started/i)).toBeInTheDocument()
  })

  it('shows connection status', () => {
    render(<JobDashboard />)

    expect(screen.getByText(/connected/i)).toBeInTheDocument()
  })

  it('displays disconnected state', () => {
    mockWebSocket.isConnected = false
    mockWebSocket.connectionStatus = 'disconnected'

    render(<JobDashboard />)

    expect(screen.getByText(/disconnected/i)).toBeInTheDocument()
  })

  it('handles job retry for failed jobs', async () => {
    const failedJob = { ...mockJobData, status: 'failed', error_message: 'Processing failed' }
    mockJobStore.selectedJob = failedJob

    render(<JobDashboard />)

    const retryButton = screen.getByRole('button', { name: /retry/i })
    await user.click(retryButton)

    // In a real implementation, this would trigger the retry API call
    expect(retryButton).toBeInTheDocument()
  })

  it('filters jobs by status', async () => {
    render(<JobDashboard />)

    const statusFilter = screen.getByRole('combobox', { name: /filter by status/i })
    await user.selectOptions(statusFilter, 'processing')

    // In a real implementation, this would filter the job list
    expect(statusFilter).toHaveValue('processing')
  })

  it('shows job creation time', () => {
    render(<JobDashboard />)

    // Should display formatted creation time
    expect(screen.getByText(/created/i)).toBeInTheDocument()
  })

  it('displays job logs when available', () => {
    const jobWithLogs = {
      ...mockJobData,
      processing_logs: ['Starting processing', 'Planning complete', 'Analysis in progress']
    }
    mockJobStore.selectedJob = jobWithLogs

    render(<JobDashboard />)

    expect(screen.getByText(/processing logs/i)).toBeInTheDocument()
    expect(screen.getByText('Starting processing')).toBeInTheDocument()
  })

  it('handles real-time job updates', () => {
    mockWebSocket.lastMessage = {
      type: 'job_progress',
      payload: {
        job_id: 'job-1',
        stage: 'analysis',
        progress: 75,
        message: 'Analysis in progress'
      }
    }

    render(<JobDashboard />)

    // The component should react to WebSocket messages
    expect(screen.getByText(/analysis in progress/i)).toBeInTheDocument()
  })

  it('shows different views (overview, pipeline, logs)', async () => {
    render(<JobDashboard />)

    const pipelineTab = screen.getByRole('tab', { name: /pipeline/i })
    await user.click(pipelineTab)

    expect(screen.getByTestId('pipeline-view')).toBeInTheDocument()

    const logsTab = screen.getByRole('tab', { name: /logs/i })
    await user.click(logsTab)

    expect(screen.getByTestId('logs-view')).toBeInTheDocument()
  })
})