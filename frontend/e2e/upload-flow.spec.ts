import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('File Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main page
    await page.goto('/')
  })

  test('should display upload interface correctly', async ({ page }) => {
    // Check that the upload area is visible
    await expect(page.locator('[data-testid="drop-zone"]')).toBeVisible()
    await expect(page.getByText(/drag & drop your pdf file here/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /browse files/i })).toBeVisible()
  })

  test('should upload a valid PDF file', async ({ page }) => {
    // Create a sample PDF file path
    const filePath = path.join(__dirname, 'fixtures', 'sample.pdf')

    // Mock the file upload
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /browse files/i }).click()
    const fileChooser = await fileChooserPromise

    // Mock file selection (in real tests, you'd have actual test files)
    await page.route('**/api/v1/upload/', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          job_id: 'test-job-123',
          message: 'Upload successful',
          paper_name: 'Test Paper'
        })
      })
    })

    // Simulate file selection
    await fileChooser.setFiles([{
      name: 'test-paper.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('mock pdf content')
    }])

    // Check for upload success message
    await expect(page.getByText(/upload successful/i)).toBeVisible({ timeout: 10000 })
  })

  test('should show error for invalid file type', async ({ page }) => {
    // Mock file upload with invalid file
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /browse files/i }).click()
    const fileChooser = await fileChooserPromise

    // Mock error response for invalid file
    await page.route('**/api/v1/upload/', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'Invalid file type. Please upload a PDF file.'
        })
      })
    })

    await fileChooser.setFiles([{
      name: 'document.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not a pdf')
    }])

    // Check for error message
    await expect(page.getByText(/invalid file type/i)).toBeVisible({ timeout: 5000 })
  })

  test('should handle drag and drop upload', async ({ page }) => {
    // Mock successful upload
    await page.route('**/api/v1/upload/', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          job_id: 'test-job-456',
          message: 'Upload successful',
          paper_name: 'Dragged Paper'
        })
      })
    })

    const dropZone = page.locator('[data-testid="drop-zone"]')

    // Simulate drag and drop
    await dropZone.dispatchEvent('dragenter', {
      dataTransfer: {
        files: [{
          name: 'dragged-paper.pdf',
          type: 'application/pdf',
          size: 1024
        }]
      }
    })

    await dropZone.dispatchEvent('drop', {
      dataTransfer: {
        files: [{
          name: 'dragged-paper.pdf',
          type: 'application/pdf',
          size: 1024
        }]
      }
    })

    // Check for upload success
    await expect(page.getByText(/upload successful/i)).toBeVisible({ timeout: 10000 })
  })

  test('should allow custom paper name input', async ({ page }) => {
    // Enter custom paper name
    const paperNameInput = page.getByPlaceholder(/enter paper name/i)
    await paperNameInput.fill('My Custom Research Paper')

    // Mock successful upload with custom name
    await page.route('**/api/v1/upload/', async route => {
      const requestBody = await route.request().postData()
      expect(requestBody).toContain('My Custom Research Paper')

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          job_id: 'test-job-789',
          message: 'Upload successful',
          paper_name: 'My Custom Research Paper'
        })
      })
    })

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /browse files/i }).click()
    const fileChooser = await fileChooserPromise

    await fileChooser.setFiles([{
      name: 'custom-paper.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('mock pdf content')
    }])

    await expect(page.getByText(/upload successful/i)).toBeVisible({ timeout: 10000 })
  })

  test('should display upload progress', async ({ page }) => {
    // Mock upload with progress updates
    let progressStep = 0
    await page.route('**/api/v1/upload/', async route => {
      // Simulate delayed response for progress
      await new Promise(resolve => setTimeout(resolve, 1000))

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          job_id: 'test-job-progress',
          message: 'Upload successful',
          paper_name: 'Progress Paper'
        })
      })
    })

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /browse files/i }).click()
    const fileChooser = await fileChooserPromise

    await fileChooser.setFiles([{
      name: 'progress-paper.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('mock pdf content')
    }])

    // Check for progress indicator
    await expect(page.getByText(/uploading/i)).toBeVisible({ timeout: 2000 })
    await expect(page.getByRole('progressbar')).toBeVisible()
  })

  test('should handle large file size error', async ({ page }) => {
    // Mock error for large file
    await page.route('**/api/v1/upload/', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'File size exceeds maximum allowed size of 100MB'
        })
      })
    })

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /browse files/i }).click()
    const fileChooser = await fileChooserPromise

    await fileChooser.setFiles([{
      name: 'large-paper.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(101 * 1024 * 1024) // 101MB
    }])

    await expect(page.getByText(/file size exceeds maximum/i)).toBeVisible({ timeout: 5000 })
  })

  test('should retry failed uploads', async ({ page }) => {
    let uploadAttempts = 0

    await page.route('**/api/v1/upload/', async route => {
      uploadAttempts++

      if (uploadAttempts === 1) {
        // First attempt fails
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Internal server error'
          })
        })
      } else {
        // Second attempt succeeds
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            job_id: 'test-job-retry',
            message: 'Upload successful',
            paper_name: 'Retry Paper'
          })
        })
      }
    })

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /browse files/i }).click()
    const fileChooser = await fileChooserPromise

    await fileChooser.setFiles([{
      name: 'retry-paper.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('mock pdf content')
    }])

    // Wait for error message
    await expect(page.getByText(/internal server error/i)).toBeVisible({ timeout: 5000 })

    // Click retry button
    await page.getByRole('button', { name: /try again/i }).click()

    // Should succeed on retry
    await expect(page.getByText(/upload successful/i)).toBeVisible({ timeout: 10000 })
    expect(uploadAttempts).toBe(2)
  })
})