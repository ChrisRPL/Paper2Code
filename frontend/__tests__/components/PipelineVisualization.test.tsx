import React from 'react'
import { render, screen, fireEvent, waitFor } from '../utils/test-utils'
import userEvent from '@testing-library/user-event'
import PipelineVisualization from '../../components/pipeline/PipelineVisualization'
import { mockJobData } from '../utils/test-utils'

// Mock ReactFlow
jest.mock('reactflow', () => ({
  ReactFlow: ({ children, nodes, edges, ...props }) => (
    <div data-testid="reactflow" {...props}>
      {nodes?.map((node) => (
        <div key={node.id} data-testid={`node-${node.id}`}>
          {node.data.label}
        </div>
      ))}
      {children}
    </div>
  ),
  Handle: (props) => <div data-testid="handle" {...props} />,
  Position: {
    Top: 'top',
    Bottom: 'bottom',
    Left: 'left',
    Right: 'right',
  },
  useNodesState: jest.fn(() => [[], jest.fn(), jest.fn()]),
  useEdgesState: jest.fn(() => [[], jest.fn(), jest.fn()]),
  addEdge: jest.fn(),
  applyNodeChanges: jest.fn(),
  applyEdgeChanges: jest.fn(),
  Controls: () => <div data-testid="controls" />,
  Background: () => <div data-testid="background" />,
}))

describe('PipelineVisualization Component', () => {
  const user = userEvent.setup()

  const defaultProps = {
    job: mockJobData,
  }

  beforeEach(() => {
    // Reset ReactFlow mocks
    const { useNodesState, useEdgesState } = require('reactflow')
    useNodesState.mockReturnValue([[], jest.fn(), jest.fn()])
    useEdgesState.mockReturnValue([[], jest.fn(), jest.fn()])
  })

  it('renders pipeline visualization', () => {
    render(<PipelineVisualization {...defaultProps} />)

    expect(screen.getByTestId('reactflow')).toBeInTheDocument()
    expect(screen.getByTestId('controls')).toBeInTheDocument()
    expect(screen.getByTestId('background')).toBeInTheDocument()
  })

  it('displays all pipeline stages', () => {
    const processingJob = {
      ...mockJobData,
      status: 'processing',
      current_stage: 'planning',
      progress: 50,
    }

    render(<PipelineVisualization job={processingJob} />)

    expect(screen.getByTestId('node-preprocessing')).toBeInTheDocument()
    expect(screen.getByTestId('node-planning')).toBeInTheDocument()
    expect(screen.getByTestId('node-analysis')).toBeInTheDocument()
    expect(screen.getByTestId('node-coding')).toBeInTheDocument()
  })

  it('highlights current stage correctly', () => {
    const processingJob = {
      ...mockJobData,
      status: 'processing',
      current_stage: 'analysis',
      progress: 65,
    }

    render(<PipelineVisualization job={processingJob} />)

    const analysisNode = screen.getByTestId('node-analysis')
    expect(analysisNode).toHaveClass('current-stage')
  })

  it('shows completed stages as finished', () => {
    const processingJob = {
      ...mockJobData,
      status: 'processing',
      current_stage: 'coding',
      progress: 85,
    }

    render(<PipelineVisualization job={processingJob} />)

    const preprocessingNode = screen.getByTestId('node-preprocessing')
    const planningNode = screen.getByTestId('node-planning')
    const analysisNode = screen.getByTestId('node-analysis')

    expect(preprocessingNode).toHaveClass('completed')
    expect(planningNode).toHaveClass('completed')
    expect(analysisNode).toHaveClass('completed')
  })

  it('displays pending stages correctly', () => {
    const pendingJob = {
      ...mockJobData,
      status: 'pending',
      current_stage: null,
      progress: 0,
    }

    render(<PipelineVisualization job={pendingJob} />)

    const allNodes = screen.getAllByTestId(/^node-/)
    allNodes.forEach(node => {
      expect(node).toHaveClass('pending')
    })
  })

  it('shows error state for failed jobs', () => {
    const failedJob = {
      ...mockJobData,
      status: 'failed',
      current_stage: 'planning',
      error_message: 'Planning failed',
    }

    render(<PipelineVisualization job={failedJob} />)

    const planningNode = screen.getByTestId('node-planning')
    expect(planningNode).toHaveClass('error')
  })

  it('displays stage progress information', () => {
    const processingJob = {
      ...mockJobData,
      status: 'processing',
      current_stage: 'analysis',
      progress: 65,
    }

    render(<PipelineVisualization job={processingJob} />)

    expect(screen.getByText('65%')).toBeInTheDocument()
    expect(screen.getByText('Analysis')).toBeInTheDocument()
  })

  it('handles node click events', async () => {
    const processingJob = {
      ...mockJobData,
      status: 'processing',
      current_stage: 'analysis',
      progress: 65,
    }

    render(<PipelineVisualization job={processingJob} />)

    const planningNode = screen.getByTestId('node-planning')
    await user.click(planningNode)

    // Should show stage details or artifacts
    expect(screen.getByText(/planning stage/i)).toBeInTheDocument()
  })

  it('displays stage artifacts when available', () => {
    const jobWithArtifacts = {
      ...mockJobData,
      status: 'processing',
      current_stage: 'analysis',
      artifacts: {
        planning: ['config.yaml', 'structure.md'],
        analysis: ['analysis.json']
      }
    }

    render(<PipelineVisualization job={jobWithArtifacts} />)

    const planningNode = screen.getByTestId('node-planning')
    expect(planningNode).toHaveAttribute('data-artifacts', '2')
  })

  it('shows estimated time remaining', () => {
    const processingJob = {
      ...mockJobData,
      status: 'processing',
      current_stage: 'analysis',
      progress: 65,
      estimated_completion: '2024-01-01T01:00:00Z'
    }

    render(<PipelineVisualization job={processingJob} />)

    expect(screen.getByText(/estimated completion/i)).toBeInTheDocument()
  })

  it('handles job completion', () => {
    const completedJob = {
      ...mockJobData,
      status: 'completed',
      current_stage: 'coding',
      progress: 100,
      completed_at: '2024-01-01T01:00:00Z'
    }

    render(<PipelineVisualization job={completedJob} />)

    const allNodes = screen.getAllByTestId(/^node-/)
    allNodes.forEach(node => {
      expect(node).toHaveClass('completed')
    })

    expect(screen.getByText(/completed/i)).toBeInTheDocument()
  })

  it('displays stage durations', () => {
    const completedJob = {
      ...mockJobData,
      status: 'completed',
      stage_durations: {
        preprocessing: 30,
        planning: 120,
        analysis: 180,
        coding: 300
      }
    }

    render(<PipelineVisualization job={completedJob} />)

    expect(screen.getByText('2m')).toBeInTheDocument() // planning duration
    expect(screen.getByText('3m')).toBeInTheDocument() // analysis duration
    expect(screen.getByText('5m')).toBeInTheDocument() // coding duration
  })

  it('shows retry option for failed stages', async () => {
    const failedJob = {
      ...mockJobData,
      status: 'failed',
      current_stage: 'analysis',
      error_message: 'Analysis failed',
    }

    render(<PipelineVisualization job={failedJob} />)

    const analysisNode = screen.getByTestId('node-analysis')
    await user.click(analysisNode)

    expect(screen.getByRole('button', { name: /retry from this stage/i })).toBeInTheDocument()
  })

  it('displays real-time updates', () => {
    const { rerender } = render(<PipelineVisualization job={mockJobData} />)

    const updatedJob = {
      ...mockJobData,
      status: 'processing',
      current_stage: 'planning',
      progress: 25,
    }

    rerender(<PipelineVisualization job={updatedJob} />)

    expect(screen.getByText('25%')).toBeInTheDocument()
    expect(screen.getByTestId('node-planning')).toHaveClass('current-stage')
  })

  it('handles zoom and pan controls', () => {
    render(<PipelineVisualization {...defaultProps} />)

    const controls = screen.getByTestId('controls')
    expect(controls).toBeInTheDocument()

    // ReactFlow controls should be available
    expect(screen.getByTestId('reactflow')).toBeInTheDocument()
  })

  it('shows stage logs when expanded', async () => {
    const jobWithLogs = {
      ...mockJobData,
      status: 'processing',
      current_stage: 'analysis',
      stage_logs: {
        planning: ['Starting planning', 'Config generated'],
        analysis: ['Analyzing content', 'Extracting features']
      }
    }

    render(<PipelineVisualization job={jobWithLogs} />)

    const planningNode = screen.getByTestId('node-planning')
    await user.doubleClick(planningNode)

    expect(screen.getByText('Starting planning')).toBeInTheDocument()
    expect(screen.getByText('Config generated')).toBeInTheDocument()
  })
})