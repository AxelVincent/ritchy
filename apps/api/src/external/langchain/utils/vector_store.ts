import { QdrantVectorStore } from '@langchain/qdrant'
import { QDRANT_CONFIG } from '../../../config/qdrant'

import { OpenAIEmbeddings } from '@langchain/openai'

const EMBEDDING_MODEL = 'text-embedding-3-small'

/**
 * Creates a new VectorStore instance with fresh OpenAIEmbeddings.
 *
 * IMPORTANT: Use this factory function for WRITE operations (addDocuments) to prevent
 * memory accumulation from the embeddings LRU cache. The global singleton pattern
 * was causing ~1-2GB of memory retention after enrichment batches.
 *
 * Each caller should create a vectorStore at the start of their operation
 * and let it be garbage collected when done.
 */
export const createVectorStore = async () => {
  const embeddings = new OpenAIEmbeddings({
    model: EMBEDDING_MODEL,
  })

  return await QdrantVectorStore.fromExistingCollection(embeddings, {
    url: QDRANT_CONFIG.URL,
    collectionName: QDRANT_CONFIG.COLLECTION_NAME,
  })
}

/**
 * Shared vectorStore instance for READ operations (similaritySearch).
 *
 * For read operations, the embeddings cache is beneficial for performance
 * and doesn't accumulate memory like write operations do.
 * This instance is lazily initialized on first access.
 */
let sharedVectorStore: QdrantVectorStore | null = null

export const getSharedVectorStore = async (): Promise<QdrantVectorStore> => {
  if (!sharedVectorStore) {
    sharedVectorStore = await createVectorStore()
  }
  return sharedVectorStore
}

/**
 * @deprecated Use createVectorStore() for write operations or getSharedVectorStore() for reads.
 * This export is kept for backward compatibility but will be removed in a future version.
 */
export const vectorStore = await createVectorStore()
