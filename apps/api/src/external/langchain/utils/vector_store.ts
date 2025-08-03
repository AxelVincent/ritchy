import { QdrantVectorStore } from '@langchain/qdrant'
import { QDRANT_CONFIG } from '../../../config/qdrant'

import { OpenAIEmbeddings } from '@langchain/openai'

const EMBEDDING_MODEL = 'text-embedding-3-small'

const embeddings = new OpenAIEmbeddings({
  model: EMBEDDING_MODEL,
})

export const vectorStore = await QdrantVectorStore.fromExistingCollection(
  embeddings,
  {
    url: QDRANT_CONFIG.URL,
    collectionName: QDRANT_CONFIG.COLLECTION_NAME,
  },
)
