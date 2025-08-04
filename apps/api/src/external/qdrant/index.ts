import { QdrantClient } from '@qdrant/js-client-rest'
import { logger } from '@ritchy/logger'
import { QDRANT_CONFIG } from '../../config/qdrant'

const VECTOR_SIZE = 1536

const COLLECTION_CONFIG = {
  vectors: {
    size: VECTOR_SIZE,
    distance: 'Cosine' as const,
  },
  optimizers_config: {
    default_segment_number: 2,
  },
  replication_factor: 1,
} as const

const REQUIRED_INDEXES = [
  {
    field_name: 'metadata.domain',
    field_schema: 'keyword' as const,
  },
] as const

export function getQdrantClient(): QdrantClient {
  return new QdrantClient({
    url: QDRANT_CONFIG.URL,
    apiKey: QDRANT_CONFIG.API_KEY,
  })
}

async function ensureIndexExists(
  client: QdrantClient,
  collectionName: string,
  index: (typeof REQUIRED_INDEXES)[number],
): Promise<void> {
  try {
    // Get collection info which includes indexes
    const collectionInfo = await client.getCollection(collectionName)
    const indexExists =
      collectionInfo.payload_schema?.[index.field_name] !== undefined

    if (!indexExists) {
      await client.createPayloadIndex(collectionName, index)
      logger.info({
        msg: `Created index for ${index.field_name}`,
        event: 'qdrant_index_created',
        metadata: { field_name: index.field_name },
      })
    }
  } catch (error) {
    logger.error({
      msg: `Failed to ensure index exists for ${index.field_name}`,
      event: 'qdrant_index_error',
      metadata: {
        field_name: index.field_name,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    throw new Error(`Failed to ensure index exists for ${index.field_name}`)
  }
}

async function ensureCollectionExists(
  client: QdrantClient,
  collectionName: string,
): Promise<void> {
  try {
    const collections = await client.getCollections()
    const collectionExists = collections.collections.some(
      (collection) => collection.name === collectionName,
    )

    if (!collectionExists) {
      await client.createCollection(collectionName, COLLECTION_CONFIG)
      logger.info({
        msg: 'Created Qdrant collection',
        event: 'qdrant_collection_created',
        metadata: { collection_name: collectionName },
      })
    }
  } catch (error) {
    logger.error({
      msg: 'Failed to ensure collection exists',
      event: 'qdrant_collection_error',
      metadata: {
        collection_name: collectionName,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    throw new Error('Failed to ensure collection exists')
  }
}

export async function initQdrantCollection(): Promise<void> {
  const client = getQdrantClient()

  try {
    // First ensure the collection exists
    await ensureCollectionExists(client, QDRANT_CONFIG.COLLECTION_NAME)

    // Then ensure all required indexes exist
    await Promise.all(
      REQUIRED_INDEXES.map((index) =>
        ensureIndexExists(client, QDRANT_CONFIG.COLLECTION_NAME, index),
      ),
    )

    logger.info({
      msg: 'Successfully initialized Qdrant collection and indexes',
      event: 'qdrant_initialization_complete',
      metadata: { collection_name: QDRANT_CONFIG.COLLECTION_NAME },
    })
  } catch (error) {
    logger.error({
      msg: 'Failed to initialize Qdrant',
      event: 'qdrant_initialization_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        config: {
          url: QDRANT_CONFIG.URL,
          hasApiKey: !!QDRANT_CONFIG.API_KEY,
        },
      },
    })
    throw new Error('Failed to initialize Qdrant')
  }
}
