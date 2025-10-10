import { logger } from '@ritchy/logger'
import { getQdrantClient } from '..'
import { QDRANT_CONFIG } from '../../../config/qdrant'

export const getWebsiteVectors = async (domain: string) => {
  try {
    const qdrantClient = getQdrantClient()
    const qdrantResponse = await qdrantClient.query(
      QDRANT_CONFIG.COLLECTION_NAME,
      {
        filter: {
          must: [
            {
              key: 'metadata.domain',
              match: {
                value: domain,
              },
            },
          ],
        },
        with_payload: true,
      },
    )

    return qdrantResponse.points || []
  } catch (error) {
    logger.error({
      msg: 'Error getting website vectors',
      event: 'get_website_vectors_error',
      metadata: { domain, error },
    })
    return []
  }
}
