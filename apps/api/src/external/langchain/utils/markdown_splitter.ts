import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

/**
 * Singleton markdown splitter instance.
 * Reusing the splitter avoids repeated initialization overhead
 * and reduces GC pressure from creating new instances on each call.
 */
const mdSplitter = RecursiveCharacterTextSplitter.fromLanguage('markdown', {
  chunkSize: 1000,
  chunkOverlap: 120,
  separators: ['\n\n', '\n', '. ', ' ', ''],
})

export const markdownSplitter = async (
  markdown: string,
  metadata: {
    domain: string
    url: string
    createdAt: Date
    updatedAt: Date
  },
) => {
  return await mdSplitter.createDocuments([markdown], [metadata])
}
