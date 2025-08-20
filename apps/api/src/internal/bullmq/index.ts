import './jobs/enrichment/batch/worker'
import './jobs/enrichment/unit/worker'
import './jobs/firecrawl/worker'
import './jobs/million_verifier/worker'
import './jobs/brightdata/worker'
import './jobs/scraper/worker'
import './jobs/whois/worker'
import type { Queue } from 'bullmq'
import { brightdataQueue } from './jobs/brightdata/queue'
import { enrichmentBatchQueue } from './jobs/enrichment/batch/queue'
import { enrichmentUnitQueue } from './jobs/enrichment/unit/queue'
import { firecrawlQueue } from './jobs/firecrawl/queue'
import { millionVerifierQueue } from './jobs/million_verifier/queue'
import { scraperQueue } from './jobs/scraper/queue'
import { whoisQueue } from './jobs/whois/queue'

export const bullmqQueues: {
  queue: Queue
  displayName: string
  type: 'bullmq'
}[] = [
  {
    queue: enrichmentBatchQueue,
    displayName: 'Enrichment Batch',
    type: 'bullmq',
  },
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
]
