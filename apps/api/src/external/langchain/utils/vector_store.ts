import { QdrantVectorStore } from '@langchain/qdrant'
import { QDRANT_CONFIG } from 'apps/api/src/config/qdrant'
import { COLLECTION_NAME } from '../../qdrant'

import { OpenAIEmbeddings } from '@langchain/openai'

const EMBEDDING_MODEL = 'text-embedding-3-small'

const embeddings = new OpenAIEmbeddings({
  model: EMBEDDING_MODEL,
})

export const vectorStore = await QdrantVectorStore.fromExistingCollection(
  embeddings,
  {
    url: `http://${QDRANT_CONFIG.HOST}:${QDRANT_CONFIG.PORT}`,
    collectionName: COLLECTION_NAME,
  },
)
