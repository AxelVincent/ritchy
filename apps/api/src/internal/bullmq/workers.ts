/**
 * BullMQ Workers Registry
 *
 * All workers run in a single process with worker threads enabled for true
 * thread isolation and memory management.
 *
 * Architecture:
 * - Each worker uses useWorkerThreads for isolation
 * - Jobs execute in separate threads, preventing memory leaks from affecting other workers
 * - Dev uses tsup --watch + node --watch for hot reloading with worker threads
 *
 * Import this file ONLY in the dedicated worker process (src/workers/index.ts).
 */

// Enrichment workers
import './jobs/enrichment-company/worker'
import './jobs/enrichment-contact/worker'

// Scraping workers (memory-intensive)
import './jobs/firecrawl/worker'
import './jobs/brightdata/worker'
import './jobs/scraper/worker'

// External service workers
import './jobs/million_verifier/worker'
import './jobs/whois/worker'
import './jobs/google/places/worker'
import './jobs/pappers/worker'

// Icypeas workers
import './jobs/icypeas/email_search/worker'
import './jobs/icypeas/profile_url_search/worker'
import './jobs/icypeas/find_people/worker'
import './jobs/icypeas/subscription_information/worker'

// ContactOut workers
import './jobs/contactout/people_search/worker'

// Forager workers
import './jobs/forager/phone_lookup/worker'
import './jobs/forager/user_information/worker'

export const WORKER_NAMES = [
  'enrichment-company',
  'enrichment-contact',
  'firecrawl',
  'brightdata',
  'scraper',
  'million-verifier',
  'whois',
  'google-places',
  'pappers',
  'icypeas-email-search',
  'icypeas-profile-url-search',
  'icypeas-find-people',
  'icypeas-subscription-information',
  'contactout-people-search',
  'forager-phone-lookup',
  'forager-user-information',
] as const

export type WorkerName = (typeof WORKER_NAMES)[number]
