import { QdrantClient } from '@qdrant/js-client-rest'
import { QDRANT_CONFIG } from '../../config/qdrant'
import { logger } from '@ritchy/logger'

export const COLLECTION_NAME = 'website_scraping'
const VECTOR_SIZE = 1536

export function getQdrantClient(): QdrantClient {
  return new QdrantClient({
    url: `http://${QDRANT_CONFIG.HOST}:${QDRANT_CONFIG.PORT}`,
    apiKey: QDRANT_CONFIG.API_KEY
  })
}

export async function initQdrantCollection(): Promise<void> {
  const client = getQdrantClient()

  try {
    const collections = await client.getCollections()
    const collectionExists = collections.collections.some(
      (collection) => collection.name === COLLECTION_NAME
    )

    if (!collectionExists) {
      await client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine'
        },
        optimizers_config: {
          default_segment_number: 2
        },
        replication_factor: 1
      })

      await client.createPayloadIndex(COLLECTION_NAME, {
        field_name: 'domain_name',
        field_schema: 'keyword'
      })
    }
  } catch (error) {
    logger.error({
      msg: 'Failed to connect to Qdrant server',
      event: 'qdrant_connection_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        config: {
          url: `http://${QDRANT_CONFIG.USER}:${QDRANT_CONFIG.PORT}`,
          hasApiKey: !!QDRANT_CONFIG.API_KEY
        }
      }
    })
    throw new Error('Failed to connect to Qdrant server')
  }
}
