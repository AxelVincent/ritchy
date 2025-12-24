/**
 * BullMQ Workers Registry
 *
 * All workers run in a single process for simplicity.
 * Memory management is handled within individual sandbox functions.
 */

// Scraper worker (memory-intensive, uses worker threads)
import './jobs/scraper/worker'

// Enrichment workers (use worker threads)
import './jobs/enrichment-company/worker'
import './jobs/enrichment-contact/worker'

// External service workers
import './jobs/brightdata/worker'
import './jobs/contactout/people_search/worker'
import './jobs/firecrawl/worker'
import './jobs/forager/phone_lookup/worker'
import './jobs/forager/user_information/worker'
import './jobs/google/places/worker'
import './jobs/icypeas/email_search/worker'
import './jobs/icypeas/find_people/worker'
import './jobs/icypeas/profile_url_search/worker'
import './jobs/icypeas/subscription_information/worker'
import './jobs/million_verifier/worker'
import './jobs/pappers/worker'
import './jobs/whois/worker'

export const WORKER_NAMES = [
  'scraper',
  'enrichment-company',
  'enrichment-contact',
  'brightdata',
  'contactout-people-search',
  'firecrawl',
  'forager-phone-lookup',
  'forager-user-information',
  'google-places',
  'icypeas-email-search',
  'icypeas-find-people',
  'icypeas-profile-url-search',
  'icypeas-subscription-information',
  'million-verifier',
  'pappers',
  'whois',
] as const

export type WorkerName = (typeof WORKER_NAMES)[number]
