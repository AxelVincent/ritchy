import './jobs/enrichment/worker'
import './jobs/firecrawl/worker'
import './jobs/million_verifier/worker'
import './jobs/brightdata/worker'
import './jobs/scraper/worker'
import './jobs/whois/worker'
import './jobs/google/places/worker'
import './jobs/pappers/worker'
import './jobs/icypeas/email_search/worker'
import './jobs/icypeas/profile_url_search/worker'
import './jobs/icypeas/find_people/worker'
import './jobs/contactout/people_search/worker'
import './jobs/forager/phone_lookup/worker'
import type { Queue } from 'bullmq'
import { brightdataQueue } from './jobs/brightdata/queue'
import { contactoutPeopleSearchQueue } from './jobs/contactout/people_search/queue'
import { enrichmentUnitQueue } from './jobs/enrichment/queue'
import { firecrawlQueue } from './jobs/firecrawl/queue'
import { foragerPhoneLookupQueue } from './jobs/forager/phone_lookup/queue'
import { googlePlacesQueue } from './jobs/google/places/queue'
import { icypeasEmailSearchQueue } from './jobs/icypeas/email_search/queue'
import { icypeasFindPeopleQueue } from './jobs/icypeas/find_people/queue'
import { icypeasProfileUrlSearchQueue } from './jobs/icypeas/profile_url_search/queue'
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
    queue: enrichmentUnitQueue,
    displayName: 'Enrichment Unit',
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
    queue: contactoutPeopleSearchQueue,
    displayName: 'ContactOut People Search',
    type: 'bullmq',
  },
  {
    queue: foragerPhoneLookupQueue,
    displayName: 'Forager Phone Lookup',
    type: 'bullmq',
  },
]
