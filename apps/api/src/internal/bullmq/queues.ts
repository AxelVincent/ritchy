/**
 * BullMQ Queue Registry
 *
 * This file exports all queue instances WITHOUT importing workers.
 * Use this in the API server to enqueue jobs and for the queue dashboard.
 *
 * Workers are imported separately in src/workers/index.ts
 */
import type { Queue } from 'bullmq'
import { brightdataQueue } from './jobs/brightdata/queue'
import { contactoutPeopleSearchQueue } from './jobs/contactout/people_search/queue'
import { companyEnrichmentQueue } from './jobs/enrichment-company/queue'
import { contactEnrichmentQueue } from './jobs/enrichment-contact/queue'
import { firecrawlQueue } from './jobs/firecrawl/queue'
import { foragerPhoneLookupQueue } from './jobs/forager/phone_lookup/queue'
import { foragerUserInformationQueue } from './jobs/forager/user_information/queue'
import { googlePlacesQueue } from './jobs/google/places/queue'
import { icypeasEmailSearchQueue } from './jobs/icypeas/email_search/queue'
import { icypeasFindPeopleQueue } from './jobs/icypeas/find_people/queue'
import { icypeasProfileUrlSearchQueue } from './jobs/icypeas/profile_url_search/queue'
import { icypeasSubscriptionInformationQueue } from './jobs/icypeas/subscription_information/queue'
import { millionVerifierQueue } from './jobs/million_verifier/queue'
import { pappersQueue } from './jobs/pappers/queue'
import { scraperQueue } from './jobs/scraper/queue'
import { whoisQueue } from './jobs/whois/queue'

export const bullmqQueues: {
  queue: Queue
  displayName: string
  type: 'bullmq'
}[] = [
  {
    queue: companyEnrichmentQueue,
    displayName: 'Enrichment Company',
    type: 'bullmq',
  },
  {
    queue: contactEnrichmentQueue,
    displayName: 'Enrichment Contact',
    type: 'bullmq',
  },
  {
    queue: firecrawlQueue,
    displayName: 'Firecrawl',
    type: 'bullmq',
  },
  {
    queue: millionVerifierQueue,
    displayName: 'Million Verifier',
    type: 'bullmq',
  },
  {
    queue: brightdataQueue,
    displayName: 'Brightdata',
    type: 'bullmq',
  },
  {
    queue: scraperQueue,
    displayName: 'Scraper',
    type: 'bullmq',
  },
  {
    queue: whoisQueue,
    displayName: 'Whois',
    type: 'bullmq',
  },
  {
    queue: googlePlacesQueue,
    displayName: 'Google Places',
    type: 'bullmq',
  },
  {
    queue: pappersQueue,
    displayName: 'Pappers',
    type: 'bullmq',
  },
  {
    queue: icypeasEmailSearchQueue,
    displayName: 'Icypeas Email Search',
    type: 'bullmq',
  },
  {
    queue: icypeasProfileUrlSearchQueue,
    displayName: 'Icypeas Profile URL Search',
    type: 'bullmq',
  },
  {
    queue: icypeasFindPeopleQueue,
    displayName: 'Icypeas Find People',
    type: 'bullmq',
  },
  {
    queue: icypeasSubscriptionInformationQueue,
    displayName: 'Icypeas Subscription Information',
    type: 'bullmq',
  },
  {
    queue: contactoutPeopleSearchQueue,
    displayName: 'ContactOut People Search',
    type: 'bullmq',
  },
  {
    queue: foragerPhoneLookupQueue,
    displayName: 'Forager Phone Lookup',
    type: 'bullmq',
  },
  {
    queue: foragerUserInformationQueue,
    displayName: 'Forager User Information',
    type: 'bullmq',
  },
]

// Re-export individual queues for direct imports
export {
  brightdataQueue,
  contactoutPeopleSearchQueue,
  companyEnrichmentQueue,
  contactEnrichmentQueue,
  firecrawlQueue,
  foragerPhoneLookupQueue,
  foragerUserInformationQueue,
  googlePlacesQueue,
  icypeasEmailSearchQueue,
  icypeasFindPeopleQueue,
  icypeasProfileUrlSearchQueue,
  icypeasSubscriptionInformationQueue,
  millionVerifierQueue,
  pappersQueue,
  scraperQueue,
  whoisQueue,
}
