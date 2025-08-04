import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

export const markdownSplitter = async (
  markdown: string,
  metadata: {
    domain: string
    url: string
    createdAt: Date
    updatedAt: Date
  },
) => {
  const mdSplitter = RecursiveCharacterTextSplitter.fromLanguage('markdown', {
    chunkSize: 1000,
    chunkOverlap: 120,
    separators: ['\n\n', '\n', '. ', ' ', ''],
  })

  return await mdSplitter.createDocuments([markdown], [metadata])
}
