import { test, expect } from '@playwright/test'

test.describe('Error Handling Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/v1/jobs/', async route => {
      await route.abort('failed')
    })

    await page.goto('/jobs')

    // Check for network error message
    await expect(page.getByText(/connection error/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible()
  })

  test('should handle API errors with proper messages', async ({ page }) => {
    // Mock API error
    await page.route('**/api/v1/upload/', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'Internal server error occurred'
        })
      })
    })

    // Try to upload a file
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /browse files/i }).click()
    const fileChooser = await fileChooserPromise

    await fileChooser.setFiles([{
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('mock content')
    }])

    // Check for specific error message
    await expect(page.getByText(/internal server error occurred/i)).toBeVisible({ timeout: 5000 })
  })

  test('should handle WebSocket connection failures', async ({ page }) => {
    // Mock WebSocket failure
    await page.addInitScript(() => {
      class FailingWebSocket {
        constructor(url) {
          this.url = url
          this.readyState = WebSocket.CONNECTING
          setTimeout(() => {
            this.readyState = WebSocket.CLOSED
            if (this.onerror) this.onerror(new Error('Connection failed'))
            if (this.onclose) this.onclose({ code: 1006, reason: 'Connection failed' })
          }, 100)
        }

        send() {
          throw new Error('WebSocket is not connected')
        }

        close() {
          this.readyState = WebSocket.CLOSED
        }

        addEventListener(event, handler) {
          if (event === 'error') {
            setTimeout(() => handler(new Error('Connection failed')), 100)
          }
        }
      }

      window.WebSocket = FailingWebSocket
    })

    await page.goto('/jobs')

    // Check for WebSocket error indication
    await expect(page.getByText(/disconnected/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/connection failed/i)).toBeVisible()
  })

  test('should handle malformed server responses', async ({ page }) => {
    // Mock malformed JSON response
    await page.route('**/api/v1/jobs/', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json response'
      })
    })

    await page.goto('/jobs')

    // Check for parsing error message
    await expect(page.getByText(/error loading jobs/i)).toBeVisible({ timeout: 5000 })
  })

  test('should show timeout errors for slow requests', async ({ page }) => {
    // Mock slow response
    await page.route('**/api/v1/upload/', async route => {
      // Delay response beyond reasonable timeout
      await new Promise(resolve => setTimeout(resolve, 60000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      })
    })

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /browse files/i }).click()
    const fileChooser = await fileChooserPromise

    await fileChooser.setFiles([{
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('mock content')
    }])

    // Check for timeout error (should appear before the 60s delay)
    await expect(page.getByText(/request timeout/i)).toBeVisible({ timeout: 30000 })
  })

  test('should handle unauthorized access', async ({ page }) => {
    // Mock 401 response
    await page.route('**/api/v1/jobs/', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'Unauthorized access'
        })
      })
    })

    await page.goto('/jobs')

    // Check for authentication error
    await expect(page.getByText(/unauthorized/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible()
  })

  test('should handle rate limiting', async ({ page }) => {
    // Mock 429 rate limit response
    await page.route('**/api/v1/upload/', async route => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'Rate limit exceeded. Please try again later.'
        })
      })
    })

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /browse files/i }).click()
    const fileChooser = await fileChooserPromise

    await fileChooser.setFiles([{
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('mock content')
    }])

    // Check for rate limit message
    await expect(page.getByText(/rate limit exceeded/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/try again later/i)).toBeVisible()
  })

  test('should handle corrupted file uploads', async ({ page }) => {
    // Mock corrupted file error
    await page.route('**/api/v1/upload/', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'File appears to be corrupted or invalid PDF format'
        })
      })
    })

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /browse files/i }).click()
    const fileChooser = await fileChooserPromise

    await fileChooser.setFiles([{
      name: 'corrupted.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('corrupted content')
    }])

    // Check for corruption error
    await expect(page.getByText(/corrupted or invalid/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible()
  })

  test('should handle service unavailable errors', async ({ page }) => {
    // Mock 503 service unavailable
    await page.route('**/api/v1/**', async route => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'Service temporarily unavailable'
        })
      })
    })

    await page.goto('/jobs')

    // Check for service unavailable message
    await expect(page.getByText(/service temporarily unavailable/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible()
  })

  test('should provide retry mechanisms for failed operations', async ({ page }) => {
    let attemptCount = 0

    // Mock failing then succeeding upload
    await page.route('**/api/v1/upload/', async route => {
      attemptCount++

      if (attemptCount <= 2) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Temporary server error'
          })
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            job_id: 'success-after-retry',
            message: 'Upload successful'
          })
        })
      }
    })

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /browse files/i }).click()
    const fileChooser = await fileChooserPromise

    await fileChooser.setFiles([{
      name: 'retry-test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('test content')
    }])

    // First attempt should fail
    await expect(page.getByText(/temporary server error/i)).toBeVisible({ timeout: 5000 })

    // Retry first time
    await page.getByRole('button', { name: /try again/i }).click()
    await expect(page.getByText(/temporary server error/i)).toBeVisible({ timeout: 5000 })

    // Retry second time should succeed
    await page.getByRole('button', { name: /try again/i }).click()
    await expect(page.getByText(/upload successful/i)).toBeVisible({ timeout: 5000 })

    expect(attemptCount).toBe(3)
  })

  test('should handle browser compatibility issues', async ({ page }) => {
    // Mock missing browser features
    await page.addInitScript(() => {
      // Remove WebSocket support
      delete window.WebSocket

      // Remove File API support
      delete window.File
      delete window.FileReader
    })

    await page.goto('/')

    // Check for compatibility warning
    await expect(page.getByText(/browser not supported/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/please update your browser/i)).toBeVisible()
  })

  test('should handle quota exceeded errors', async ({ page }) => {
    // Mock quota exceeded error
    await page.route('**/api/v1/upload/', async route => {
      await route.fulfill({
        status: 413,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'Storage quota exceeded. Please contact administrator.'
        })
      })
    })

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /browse files/i }).click()
    const fileChooser = await fileChooserPromise

    await fileChooser.setFiles([{
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('content')
    }])

    // Check for quota error
    await expect(page.getByText(/storage quota exceeded/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/contact administrator/i)).toBeVisible()
  })

  test('should show detailed error information in development mode', async ({ page }) => {
    // Mock detailed error response
    await page.route('**/api/v1/upload/', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'Internal server error',
          error_code: 'PDF_PROCESSING_FAILED',
          stack_trace: 'TypeError: Cannot read property of undefined...',
          request_id: 'req_123456'
        })
      })
    })

    // Set development mode
    await page.addInitScript(() => {
      window.localStorage.setItem('debug_mode', 'true')
    })

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /browse files/i }).click()
    const fileChooser = await fileChooserPromise

    await fileChooser.setFiles([{
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('content')
    }])

    // Check for detailed error information
    await expect(page.getByText(/PDF_PROCESSING_FAILED/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/req_123456/i)).toBeVisible()
  })
})