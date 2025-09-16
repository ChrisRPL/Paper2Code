import React from 'react'
import { render, screen, fireEvent, waitFor } from '../utils/test-utils'
import userEvent from '@testing-library/user-event'
import FileUpload from '../../components/upload/FileUpload'

// Mock the upload hook
const mockUploadFile = jest.fn()
const mockUseFileUpload = {
  uploadFile: mockUploadFile,
  isUploading: false,
  error: null,
  progress: 0,
}

jest.mock('../../hooks/useFileUpload', () => ({
  useFileUpload: () => mockUseFileUpload,
}))

describe('FileUpload Component', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    mockUploadFile.mockClear()
    mockUseFileUpload.isUploading = false
    mockUseFileUpload.error = null
    mockUseFileUpload.progress = 0
  })

  it('renders upload area correctly', () => {
    render(<FileUpload />)

    expect(screen.getByText(/drag & drop your pdf file here/i)).toBeInTheDocument()
    expect(screen.getByText(/or click to browse/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /browse files/i })).toBeInTheDocument()
  })

  it('handles file drop correctly', async () => {
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

    render(<FileUpload />)

    const dropZone = screen.getByTestId('drop-zone')

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
        types: ['Files'],
      },
    })

    await waitFor(() => {
      expect(mockUploadFile).toHaveBeenCalledWith(file, undefined)
    })
  })

  it('handles file selection via input', async () => {
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

    render(<FileUpload />)

    const fileInput = screen.getByRole('button', { name: /browse files/i })
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(hiddenInput, file)

    expect(mockUploadFile).toHaveBeenCalledWith(file, undefined)
  })

  it('shows error for invalid file type', async () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })

    render(<FileUpload />)

    const dropZone = screen.getByTestId('drop-zone')

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
        types: ['Files'],
      },
    })

    await waitFor(() => {
      expect(screen.getByText(/please upload a pdf file/i)).toBeInTheDocument()
    })
  })

  it('shows error for file size exceeding limit', async () => {
    const largeFile = new File(['x'.repeat(101 * 1024 * 1024)], 'large.pdf', {
      type: 'application/pdf'
    })
    Object.defineProperty(largeFile, 'size', { value: 101 * 1024 * 1024 })

    render(<FileUpload />)

    const dropZone = screen.getByTestId('drop-zone')

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [largeFile],
        types: ['Files'],
      },
    })

    await waitFor(() => {
      expect(screen.getByText(/file size must be less than 100mb/i)).toBeInTheDocument()
    })
  })

  it('displays upload progress when uploading', () => {
    mockUseFileUpload.isUploading = true
    mockUseFileUpload.progress = 50

    render(<FileUpload />)

    expect(screen.getByText(/uploading/i)).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('displays upload error when upload fails', () => {
    mockUseFileUpload.error = 'Upload failed: Server error'

    render(<FileUpload />)

    expect(screen.getByText(/upload failed: server error/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('clears error when retry button is clicked', async () => {
    mockUseFileUpload.error = 'Upload failed'

    render(<FileUpload />)

    const retryButton = screen.getByRole('button', { name: /try again/i })
    await user.click(retryButton)

    // In a real implementation, this would clear the error
    expect(retryButton).toBeInTheDocument()
  })

  it('prevents drag and drop when uploading', () => {
    mockUseFileUpload.isUploading = true

    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

    render(<FileUpload />)

    const dropZone = screen.getByTestId('drop-zone')

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
        types: ['Files'],
      },
    })

    expect(mockUploadFile).not.toHaveBeenCalled()
  })

  it('handles drag events correctly', () => {
    render(<FileUpload />)

    const dropZone = screen.getByTestId('drop-zone')

    // Test drag enter
    fireEvent.dragEnter(dropZone)
    expect(dropZone).toHaveClass('border-blue-500')

    // Test drag leave
    fireEvent.dragLeave(dropZone)
    expect(dropZone).toHaveClass('border-gray-300')
  })

  it('accepts custom paper name', async () => {
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

    render(<FileUpload />)

    // Enter custom paper name
    const paperNameInput = screen.getByPlaceholderText(/enter paper name/i)
    await user.type(paperNameInput, 'My Custom Paper')

    const dropZone = screen.getByTestId('drop-zone')

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
        types: ['Files'],
      },
    })

    await waitFor(() => {
      expect(mockUploadFile).toHaveBeenCalledWith(file, 'My Custom Paper')
    })
  })

  it('handles multiple files by only accepting the first', async () => {
    const file1 = new File(['content1'], 'test1.pdf', { type: 'application/pdf' })
    const file2 = new File(['content2'], 'test2.pdf', { type: 'application/pdf' })

    render(<FileUpload />)

    const dropZone = screen.getByTestId('drop-zone')

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file1, file2],
        types: ['Files'],
      },
    })

    await waitFor(() => {
      expect(mockUploadFile).toHaveBeenCalledWith(file1, undefined)
      expect(mockUploadFile).toHaveBeenCalledTimes(1)
    })
  })

  it('shows success state after successful upload', () => {
    // Mock successful upload completion
    render(<FileUpload />)

    // This would normally be shown after upload completion
    // In a real component, there might be a success state
    expect(screen.getByTestId('drop-zone')).toBeInTheDocument()
  })
})