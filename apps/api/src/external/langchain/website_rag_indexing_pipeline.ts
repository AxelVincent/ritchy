import type { QdrantVectorStore } from '@langchain/qdrant'
import { markdownSplitter } from './utils/markdown_splitter'

/**
 * Indexes markdown content into the vector store for RAG retrieval.
 *
 * @param vectorStore - The vector store instance to use (created per-job to prevent memory leaks)
 * @param domain - The domain of the website
 * @param url - The URL of the page
 * @param markdown - The markdown content to index
 */
export const websiteRagIndexingPipeline = async (
  vectorStore: QdrantVectorStore,
  domain: string,
  url: string,
  markdown: string,
) => {
  const now = new Date()
  let documents: Awaited<ReturnType<typeof markdownSplitter>> | null =
    await markdownSplitter(markdown, {
      domain,
      url,
      createdAt: now,
      updatedAt: now,
    })
  await vectorStore.addDocuments(documents)
  // Clear documents array to allow GC to reclaim memory immediately
  documents = null
}
