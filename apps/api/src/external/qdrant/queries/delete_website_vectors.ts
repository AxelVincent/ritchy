import { logger } from '@ritchy/logger'
import { QDRANT_CONFIG } from 'apps/api/src/config/qdrant'
import { getQdrantClient } from '..'

export const deleteWebsiteVectors = async (domain: string) => {
  try {
    const qdrantClient = getQdrantClient()
    await qdrantClient.delete(QDRANT_CONFIG.COLLECTION_NAME, {
      filter: {
        must: [{ key: 'metadata.domain', match: { value: domain } }],
      },
    })
  } catch (error) {
    logger.error({
      msg: 'Error deleting website vectors',
      event: 'delete_website_vectors_error',
      metadata: { domain, error },
    })
  }
}
