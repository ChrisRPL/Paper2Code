import { test, expect } from '@playwright/test'

test.describe('Job Monitoring Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock initial jobs data
    await page.route('**/api/v1/jobs/', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jobs: [
            {
              id: 'job-1',
              paper_name: 'Test Paper 1',
              status: 'processing',
              progress: 25,
              current_stage: 'planning',
              created_at: '2024-01-01T10:00:00Z'
            },
            {
              id: 'job-2',
              paper_name: 'Test Paper 2',
              status: 'completed',
              progress: 100,
              current_stage: 'coding',
              created_at: '2024-01-01T09:00:00Z',
              completed_at: '2024-01-01T09:30:00Z'
            },
            {
              id: 'job-3',
              paper_name: 'Test Paper 3',
              status: 'failed',
              progress: 40,
              current_stage: 'analysis',
              error_message: 'Analysis failed due to invalid paper format',
              created_at: '2024-01-01T08:00:00Z'
            }
          ],
          total: 3
        })
      })
    })

    await page.goto('/jobs')
  })

  test('should display job list with correct information', async ({ page }) => {
    // Check that all jobs are displayed
    await expect(page.getByText('Test Paper 1')).toBeVisible()
    await expect(page.getByText('Test Paper 2')).toBeVisible()
    await expect(page.getByText('Test Paper 3')).toBeVisible()

    // Check status indicators
    await expect(page.getByText('processing')).toBeVisible()
    await expect(page.getByText('completed')).toBeVisible()
    await expect(page.getByText('failed')).toBeVisible()

    // Check progress indicators
    await expect(page.getByText('25%')).toBeVisible()
    await expect(page.getByText('100%')).toBeVisible()
  })

  test('should allow job selection and show details', async ({ page }) => {
    // Click on the first job
    await page.getByRole('button', { name: /test paper 1/i }).click()

    // Check that job details are displayed
    await expect(page.getByText('planning')).toBeVisible()
    await expect(page.getByText('25%')).toBeVisible()
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible()
  })

  test('should show different actions for different job states', async ({ page }) => {
    // Check processing job actions
    await page.getByRole('button', { name: /test paper 1/i }).click()
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible()

    // Check completed job actions
    await page.getByRole('button', { name: /test paper 2/i }).click()
    await expect(page.getByRole('button', { name: /download/i })).toBeVisible()

    // Check failed job actions
    await page.getByRole('button', { name: /test paper 3/i }).click()
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible()
    await expect(page.getByText(/analysis failed/i)).toBeVisible()
  })

  test('should handle job cancellation', async ({ page }) => {
    // Mock cancel job API
    await page.route('**/api/v1/jobs/job-1/cancel', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Job cancelled successfully'
        })
      })
    })

    // Select processing job and cancel it
    await page.getByRole('button', { name: /test paper 1/i }).click()
    await page.getByRole('button', { name: /cancel/i }).click()

    // Confirm cancellation in dialog
    await expect(page.getByText(/are you sure/i)).toBeVisible()
    await page.getByRole('button', { name: /confirm/i }).click()

    // Check for success message
    await expect(page.getByText(/job cancelled successfully/i)).toBeVisible({ timeout: 5000 })
  })

  test('should handle job retry for failed jobs', async ({ page }) => {
    // Mock retry job API
    await page.route('**/api/v1/jobs/job-3/retry', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Job retry started'
        })
      })
    })

    // Select failed job and retry it
    await page.getByRole('button', { name: /test paper 3/i }).click()
    await page.getByRole('button', { name: /retry/i }).click()

    // Check for success message
    await expect(page.getByText(/job retry started/i)).toBeVisible({ timeout: 5000 })
  })

  test('should handle job download for completed jobs', async ({ page }) => {
    // Mock download API
    await page.route('**/api/v1/jobs/job-2/download', async route => {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="test-paper-2-repo.zip"'
        },
        body: Buffer.from('mock zip content')
      })
    })

    // Select completed job and download it
    await page.getByRole('button', { name: /test paper 2/i }).click()

    // Start download
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /download/i }).click()
    const download = await downloadPromise

    // Verify download
    expect(download.suggestedFilename()).toBe('test-paper-2-repo.zip')
  })

  test('should filter jobs by status', async ({ page }) => {
    // Use status filter
    await page.selectOption('select[name="status-filter"]', 'processing')

    // Only processing jobs should be visible
    await expect(page.getByText('Test Paper 1')).toBeVisible()
    await expect(page.getByText('Test Paper 2')).not.toBeVisible()
    await expect(page.getByText('Test Paper 3')).not.toBeVisible()

    // Change to completed filter
    await page.selectOption('select[name="status-filter"]', 'completed')
    await expect(page.getByText('Test Paper 2')).toBeVisible()
    await expect(page.getByText('Test Paper 1')).not.toBeVisible()
  })

  test('should display real-time job updates via WebSocket', async ({ page }) => {
    // Mock WebSocket connection
    await page.addInitScript(() => {
      class MockWebSocket {
        constructor(url) {
          this.url = url
          this.readyState = WebSocket.CONNECTING
          setTimeout(() => {
            this.readyState = WebSocket.OPEN
            if (this.onopen) this.onopen()
          }, 100)
        }

        send(data) {
          // Mock sending subscription message
        }

        close() {
          this.readyState = WebSocket.CLOSED
          if (this.onclose) this.onclose()
        }

        addEventListener(event, handler) {
          if (event === 'message') {
            // Simulate receiving job progress update after 2 seconds
            setTimeout(() => {
              handler({
                data: JSON.stringify({
                  type: 'job_progress',
                  payload: {
                    job_id: 'job-1',
                    stage: 'analysis',
                    progress: 65,
                    message: 'Analysis in progress...'
                  }
                })
              })
            }, 2000)
          }
        }
      }

      window.WebSocket = MockWebSocket
    })

    await page.goto('/jobs')

    // Select the processing job
    await page.getByRole('button', { name: /test paper 1/i }).click()

    // Wait for real-time update
    await expect(page.getByText('65%')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('analysis')).toBeVisible()
  })

  test('should show pipeline visualization', async ({ page }) => {
    // Select a job and switch to pipeline view
    await page.getByRole('button', { name: /test paper 1/i }).click()
    await page.getByRole('tab', { name: /pipeline/i }).click()

    // Check that pipeline visualization is displayed
    await expect(page.getByTestId('pipeline-view')).toBeVisible()
    await expect(page.getByTestId('reactflow')).toBeVisible()

    // Check that stages are displayed
    await expect(page.getByText(/preprocessing/i)).toBeVisible()
    await expect(page.getByText(/planning/i)).toBeVisible()
    await expect(page.getByText(/analysis/i)).toBeVisible()
    await expect(page.getByText(/coding/i)).toBeVisible()
  })

  test('should display job logs', async ({ page }) => {
    // Mock job with logs
    await page.route('**/api/v1/jobs/job-1/logs', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          logs: [
            'Starting processing...',
            'Preprocessing completed',
            'Planning stage initiated',
            'Planning configuration generated'
          ]
        })
      })
    })

    // Select job and switch to logs view
    await page.getByRole('button', { name: /test paper 1/i }).click()
    await page.getByRole('tab', { name: /logs/i }).click()

    // Check that logs are displayed
    await expect(page.getByText('Starting processing...')).toBeVisible()
    await expect(page.getByText('Planning configuration generated')).toBeVisible()
  })

  test('should handle connection status display', async ({ page }) => {
    // Check connected status
    await expect(page.getByText(/connected/i)).toBeVisible()

    // Simulate disconnection
    await page.addInitScript(() => {
      window.dispatchEvent(new CustomEvent('websocket-disconnected'))
    })

    await expect(page.getByText(/disconnected/i)).toBeVisible({ timeout: 2000 })
  })

  test('should handle empty job list', async ({ page }) => {
    // Mock empty jobs response
    await page.route('**/api/v1/jobs/', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jobs: [],
          total: 0
        })
      })
    })

    await page.goto('/jobs')

    // Check empty state
    await expect(page.getByText(/no jobs found/i)).toBeVisible()
    await expect(page.getByText(/upload a pdf to get started/i)).toBeVisible()
  })

  test('should handle job deletion', async ({ page }) => {
    // Mock delete job API
    await page.route('**/api/v1/jobs/job-1', async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Job deleted successfully'
          })
        })
      }
    })

    // Select job and delete it
    await page.getByRole('button', { name: /test paper 1/i }).click()
    await page.getByRole('button', { name: /delete/i }).click()

    // Confirm deletion
    await expect(page.getByText(/delete job/i)).toBeVisible()
    await page.getByRole('button', { name: /delete/i }).click()

    // Check for success message
    await expect(page.getByText(/job deleted successfully/i)).toBeVisible({ timeout: 5000 })
  })
})