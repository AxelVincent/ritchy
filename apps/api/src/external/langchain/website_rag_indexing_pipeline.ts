import { markdownSplitter } from './utils/markdown_splitter'
import { vectorStore } from './utils/vector_store'

export const websiteRagIndexingPipeline = async (
  domain: string,
  url: string,
  markdown: string,
) => {
  const documents = await markdownSplitter(markdown)
  await vectorStore.addDocuments(documents, {
    customPayload: [{ domain, url }],
  })
}
