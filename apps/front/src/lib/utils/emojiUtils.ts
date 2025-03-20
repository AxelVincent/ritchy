import data from '@emoji-mart/data'
import { getEmojiDataFromNative, init } from 'emoji-mart'

// Initialize emoji-mart data once
let isInitialized = false

// Cache for emoji URLs to avoid repeated processing
const emojiUrlCache = new Map<string, string>()

/**
 * Initialize emoji data
 */
const initEmojiData = () => {
  if (!isInitialized) {
    init({ data })
    isInitialized = true
  }
}

/**
 * Get Apple emoji image URL from native emoji
 * Uses caching to avoid repeated data fetching
 */
export const getAppleEmojiUrl = async (emoji: string): Promise<string> => {
  // Initialize data if needed
  initEmojiData()

  // Check cache first
  if (emojiUrlCache.has(emoji)) {
    return emojiUrlCache.get(emoji) as string
  }

  try {
    // Get emoji data using emoji-mart
    const emojiData = await getEmojiDataFromNative(emoji)

    if (!emojiData) {
      console.warn(`No emoji data found for: ${emoji}`)
      return ''
    }

    // Use Apple emoji set instead of Twitter
    // You might need to adjust this URL based on how emoji-mart structures Apple emoji assets
    const url = `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@14.0.0/img/apple/64/${emojiData.unified.toLowerCase()}.png`

    // Store in cache
    emojiUrlCache.set(emoji, url)

    return url
  } catch (error) {
    console.error('Error getting emoji data:', error)
    return ''
  }
}
