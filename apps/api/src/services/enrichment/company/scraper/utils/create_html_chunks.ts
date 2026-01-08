/**
 * Creates safe HTML chunks by cutting at whitespace boundaries
 * This prevents cutting HTML tags or words in the middle
 * @param htmlText - The HTML content to chunk
 * @param chunkSize - Target size of each chunk in characters
 * @returns Array of HTML chunks
 */
export const createHtmlChunks = (
  htmlText: string,
  chunkSize: number,
): string[] => {
  const chunks: string[] = []
  let currentPos = 0

  while (currentPos < htmlText.length) {
    let cutPoint = Math.min(currentPos + chunkSize, htmlText.length)

    if (cutPoint < htmlText.length) {
      // Find whitespace to cut safely
      for (let i = cutPoint; i > currentPos; i--) {
        if (/\s/.test(htmlText[i])) {
          cutPoint = i + 1
          break
        }
      }
    }

    chunks.push(htmlText.slice(currentPos, cutPoint))
    currentPos = cutPoint
  }

  return chunks
}
