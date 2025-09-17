# Next Steps Plan — feat/end-to-end-testing-error-handling

## Context Summary
- Goal: Hardening end-to-end error handling across upload → processing → monitoring, with resilient retries and clear UX.
- Current state:
  - Backend foundation, services and WebSocket plumbing exist and work async-first.
  - New retry utility added (`backend/app/core/retry.py`).
  - Playwright E2E coverage added for error scenarios (`frontend/e2e/error-handling.spec.ts`) and job monitoring flows.
  - Docs outline an MVP→real-time→UX roadmap; this branch focuses on the “Testing & Frontend Integration” and robust error handling.

## Recent Commits (branch highlights)
- feat: implement comprehensive retry logic with exponential backoff → `backend/app/core/retry.py` introduced with preset configs.
- test: implement comprehensive Playwright E2E tests → Error handling and job monitoring specs.
- test: add unit/integration test scaffolding for backend services and API endpoints.

## Findings and Gaps
- Backend
  - Missing endpoints referenced by tests and UI flows:
    - POST `/api/v1/jobs/{job_id}/retry`
    - GET `/api/v1/jobs/{job_id}/logs`
    - GET `/api/v1/jobs/statistics`
  - No global exception handler / response normalization. Errors return raw `detail` strings; E2E also expects extra fields in dev (e.g., `error_code`, `request_id`).
  - Rate limiting (429) not implemented; E2E expects clear 429 message.
  - Service dependency failures (e.g., Grobid unavailable) should be mapped to 503 Service Unavailable with actionable message.
  - Retry utility not yet integrated into critical operations (HTTP calls, subprocess PDF→JSON, file ops).
- Frontend
  - `useWebSocket` has reconnection/backoff and emits error messages, but ensure UI surfaces “Disconnected/Retry” affordances consistently.
  - No shared fetch client with timeouts/retries/error normalization. E2E expects “request timeout,” “retry,” “unauthorized/login”, “rate limit” messages.
  - Upload retry UX: tests assume “Try again” workflows.

## Implementation Plan

### Phase A — Backend Error Handling & API Completeness
1) Global error middleware and response schema
   - Add `backend/app/core/errors.py` with handlers for `HTTPException`, `RequestValidationError`, and generic `Exception`.
   - Shape: `{ detail: string, error_code?: string, request_id?: string }` (include `error_code` and `request_id` when `settings.DEBUG` or for 5xx).
   - Add middleware to inject `X-Request-ID` (header or generated UUID) and include it in error bodies.
   - Files: `app/main.py` (register handlers/middleware), `app/core/errors.py` (new).

2) Rate limiting (429)
   - Lightweight in-memory token bucket per-IP+route for dev (configurable).
   - Return 429 with `Retry-After` and `{ detail: 'Rate limit exceeded. Please try again later.' }`.
   - Scope: apply to `/api/v1/upload/` and optionally list endpoints.
   - Files: `app/core/middleware.py` (new) or inline in `main.py`.

3) Service dependency health mapping (503)
   - When Grobid is down, raise dedicated exception translating to
     - `HTTP 503` `{ detail: 'Service temporarily unavailable' }` (production), and
     - Include `error_code: 'SERVICE_UNAVAILABLE'` in debug.
   - Files: `app/services/file_manager.py` (map Grobid check failure), `app/core/errors.py`.

4) Missing Job APIs
   - POST `/api/v1/jobs/{job_id}/retry`
     - Preconditions: job status `ERROR` (failed) only; reset status/stage/progress; schedule background processing (reuse existing background task path).
     - Response: `{ message: 'Job retry started' }`.
   - GET `/api/v1/jobs/{job_id}/logs`
     - Return parsed `processing_logs` JSON list or empty list.
   - GET `/api/v1/jobs/statistics`
     - Aggregates: total_jobs, jobs_by_status { pending, processing, completed, failed }.
   - Files: `app/api/v1/jobs.py`, `app/services/job_tracker.py` (helper methods if needed).

5) Timeouts and request size limits
   - Enforce max upload size using existing validation; add explicit FastAPI request size limit if needed.
   - Ensure outbound HTTP (httpx) and subprocess calls use explicit timeouts.
   - Map timeouts to 504/500 with `{ detail: 'Request timeout' }` per E2E expectations.

Acceptance for Phase A
- Error responses are normalized with `detail`; include `error_code`/`request_id` in dev for 5xx.
- E2E: rate limiting, service unavailable, malformed JSON, unauthorized all surface the expected messages.
- New endpoints respond per tests: retry, logs, and statistics.

### Phase B — Integrate Retry Logic Where It Matters
1) Decorate operations with `retry_with_backoff`
   - `FileManagerService.convert_pdf_to_json` → use `SUBPROCESS_RETRY_CONFIG`.
   - Grobid health check and HTTP calls → `NETWORK_RETRY_CONFIG`.
   - File deletion and cleanup where transient I/O errors occur → `FILE_OPERATION_RETRY_CONFIG`.

2) Classify errors
   - Throw `RetryableError` for transient failures; `PermanentError` for validation/unsupported format.
   - Ensure top-level handlers convert final failure into precise HTTP status and message.

Acceptance for Phase B
- Intermittent failures succeed after configured retries; logs show attempt counts.
- Final failures propagate normalized error with useful detail and request ID.

### Phase C — Frontend Error UX & Resilient Requests
1) Shared API client
   - Create `frontend/lib/api.ts` with `fetchWithTimeout` and automatic retry (limited) for idempotent GETs.
   - Map status codes → normalized messages:
     - 400/422: show server `detail`.
     - 401: show “Unauthorized” with Login action.
     - 413: show “Storage quota exceeded. Please contact administrator.”
     - 429: show “Rate limit exceeded. Please try again later.” and retry hint.
     - 500/503/504: show actionable copy; show `error_code`/`request_id` in debug mode (`localStorage.debug_mode`).

2) Upload flow retry UX
   - On transient upload failure (5xx), surface “Try again” CTA and re-attempt with backoff (align with E2E: 2 failures then success scenario).
   - Enforce client-side timeout (e.g., 20–30s) and show “Request timeout”.

3) Connection status banner
   - Small component to surface `useWebSocket` connection status (“Connected/Disconnected/Retrying…”) and manual retry button.
   - Display error reasons from websocket error messages.

Acceptance for Phase C
- E2E error-handling.spec.ts scenarios pass: network errors, API errors, WS failures, malformed response, timeout, 401, 429, corrupted file, 503, retry mechanisms, browser compatibility, quota exceeded, dev-mode details.

### Phase D — WebSocket Hardening
- Server: optionally add periodic ping responses and detect silent clients; current client pings every 30s already.
- Ensure job subscription replays last known state (optional stretch): on subscribe, send a snapshot event.

Acceptance for Phase D
- On forced WS failure, UI shows “disconnected” and the specific error reason; automatic reconnect attempts with backoff occur.

### Phase E — Tests & Tooling
- Backend integration tests for new endpoints (retry/logs/statistics) and error normalizer.
- Frontend unit/integration tests for API client and error mappers.
- Make Playwright CI stable with appropriate timeouts and tracing on first retry.

## File-Level Task Map
- Backend
  - `app/main.py`: register error handlers and request-id middleware.
  - `app/core/errors.py` (new): exception handlers + helpers.
  - `app/core/middleware.py` (new, optional): rate limiter and request-id.
  - `app/api/v1/jobs.py`: add retry, logs, statistics endpoints; wire background processing.
  - `app/services/file_manager.py`: integrate retry, map Grobid down → 503.
  - `app/core/retry.py`: reuse existing configs; raise `RetryableError`/`PermanentError` appropriately.
- Frontend
  - `frontend/lib/api.ts` (new): fetchWithTimeout, error normalization, limited retries.
  - Upload UI component(s): add Try Again flow and timeout messaging.
  - Connection banner component (small UI) leveraging `useConnectionStore`.

## Acceptance Criteria (E2E Mapping)
- Network error: “Connection error” visible and Retry button present.
- API 500: specific error detail shown from server.
- WS failure: “Disconnected” and “Connection failed” shown.
- Malformed JSON: “Error loading jobs”.
- Timeout: “Request timeout” appears before server delayed response.
- 401: “Unauthorized” with Login button.
- 429: “Rate limit exceeded. Please try again later.”
- Corrupted file: server responds 400 with validation detail; UI shows “corrupted or invalid”.
- 503: “Service temporarily unavailable” with Retry.
- Retry flow: two failures then success; UI shows “Try again” twice then “Upload successful”.
- Dev mode: `debug_mode=true` shows `error_code` and `request_id`.

## Risks & Mitigations
- False positives on rate limit (dev): make it configurable and disable by default in local.
- Over-retrying long-running conversions: cap attempts and total backoff; surface progress to WS logs.
- Grobid availability: provide a clear setup guide (`backend/GROBID_SETUP.md`) and actionable messages.

## Suggested Timeline
- Day 1–2: Backend errors/middleware and missing endpoints.
- Day 3: Retry integration in file ops + dependency mapping to statuses.
- Day 4: Frontend API client + error UI; connection banner.
- Day 5: Tests stabilization; polish and docs.

## Done Definition for Branch
- All error-handling E2E tests pass reliably locally.
- New backend endpoints implemented with unit/integration coverage.
- Retry integrated into critical paths with observability (logs/errors contain attempt info).
- Clear, consistent error messages across frontend and backend with request IDs in dev.
