import { markdownSplitter } from './utils/markdown_splitter'
import { vectorStore } from './utils/vector_store'

export const websiteRagIndexingPipeline = async (
  domain: string,
  url: string,
  markdown: string,
) => {
  const now = new Date()
  const documents = await markdownSplitter(markdown, {
    domain,
    url,
    createdAt: now,
    updatedAt: now,
  })
  await vectorStore.addDocuments(documents)
}
