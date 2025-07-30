import { COLLECTION_NAME, getQdrantClient } from '../../../external/qdrant'

export const getWebsiteVectors = async (domain: string) => {
  const qdrantClient = getQdrantClient()
  const qdrantResponse = await qdrantClient.query(COLLECTION_NAME, {
    filter: {
      must: [
        {
          key: 'domain_name',
          match: {
            value: domain,
          },
        },
      ],
    },
    with_payload: true,
  })

  return qdrantResponse.points
}
