import data from '@emoji-mart/data'
import { SearchIndex, getEmojiDataFromNative, init } from 'emoji-mart'

// Initialize emoji-mart data once
let isInitialized = false

// Cache for emoji URLs to avoid repeated processing
const emojiUrlCache = new Map<string, string>()
const shortcodeCache = new Map<string, string>()

/**
 * Initialize emoji data
 */
export const initEmojiData = () => {
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

/**
 * Get Apple emoji image URL from shortcode (e.g., :dog2:)
 * Uses caching to avoid repeated data fetching
 */
export const getEmojiUrlFromShortcode = async (
  shortcode: string,
): Promise<string> => {
  // Initialize data if needed
  initEmojiData()

  // Ensure shortcode format (add colons if missing)
  const formattedShortcode = shortcode.startsWith(':')
    ? shortcode
    : `:${shortcode}`
  const finalShortcode = formattedShortcode.endsWith(':')
    ? formattedShortcode
    : `${formattedShortcode}:`

  // Check cache first
  if (shortcodeCache.has(finalShortcode)) {
    return shortcodeCache.get(finalShortcode) as string
  }

  try {
    // Search for emoji by shortcode
    const searchResults = await SearchIndex.search(
      finalShortcode.replace(/:/g, ''),
    )

    if (!searchResults || searchResults.length === 0) {
      console.warn(`No emoji found for shortcode: ${finalShortcode}`)
      return ''
    }

    // Get the first matching emoji
    const emoji = searchResults[0]

    // Use Apple emoji set
    const url = `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@14.0.0/img/apple/64/${emoji.unified.toLowerCase()}.png`

    // Store in cache
    shortcodeCache.set(finalShortcode, url)

    return url
  } catch (error) {
    console.error('Error getting emoji from shortcode:', error)
    return ''
  }
}
