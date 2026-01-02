/**
 * BullMQ Module
 *
 * Architecture:
 * - queues.ts: Queue instances (for API server - enqueueing jobs)
 * - workers.ts: Worker instances (for worker process - processing jobs)
 *
 * Usage:
 * - API server: import { bullmqQueues } from './internal/bullmq/queues'
 * - Worker process: import './internal/bullmq/workers' (via src/workers/index.ts)
 *
 * The API and workers run as separate processes:
 * - pnpm dev:api    → API server (HTTP, WebSocket, queue dashboard)
 * - pnpm dev:workers → Worker process (job processing)
 * - pnpm dev        → Both processes via concurrently
 */

export { bullmqQueues } from './queues'
