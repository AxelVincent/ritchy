import type { Place } from '@ritchy/types'
import { getEmojiSvg, styleEmojiSvg } from './emojiCache'

// Utility function to lighten a hex color
const lightenColor = (hex: string, amount: number): string => {
  // Remove the # if present
  const cleanHex = hex.replace('#', '')

  // Parse the hex values to RGB
  let r = Number.parseInt(cleanHex.substring(0, 2), 16)
  let g = Number.parseInt(cleanHex.substring(2, 4), 16)
  let b = Number.parseInt(cleanHex.substring(4, 6), 16)

  // Lighten each component
  r = Math.min(255, Math.round(r + (255 - r) * amount))
  g = Math.min(255, Math.round(g + (255 - g) * amount))
  b = Math.min(255, Math.round(b + (255 - b) * amount))

  // Convert back to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

// Cache common SVG namespace
const SVG_NS = 'http://www.w3.org/2000/svg'

// Pure function to create filtered marker SVG
export const createFilteredMarkerSvg = (): SVGElement => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 8 8')
  svg.setAttribute('width', '8')
  svg.setAttribute('height', '8')

  const circle = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'circle',
  )
  circle.setAttribute('cx', '4')
  circle.setAttribute('cy', '4')
  circle.setAttribute('r', '3')
  circle.setAttribute('fill', '#808080')
  circle.setAttribute('stroke', '#000000')
  circle.setAttribute('stroke-width', '1')
  circle.setAttribute('stroke-opacity', '0.3')

  svg.appendChild(circle)
  return svg
}

// Create SVG defs element for sprite definitions
const createSvgSprites = (): SVGElement => {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.style.display = 'none'
  svg.innerHTML = `
    <defs>
      <symbol id="pin-marker" viewBox="0 0 64 64">
        <path d="M24 8C17.383 8 12 13.383 12 20c0 9 12 20 12 20s12-11 12-20c0-6.617-5.383-12-12-12z" />
        <path class="inner-ring" d="M24 9.5C18.21 9.5 13.5 14.21 13.5 20c0 8.15 10.5 18.5 10.5 18.5S34.5 28.15 34.5 20c0-5.79-4.71-10.5-10.5-10.5z" fill="none" />
      </symbol>
      <symbol id="filtered-marker" viewBox="0 0 8 8">
        <circle cx="4" cy="4" r="3" fill="#808080" stroke="#000000" stroke-width="1" stroke-opacity="0.3" />
      </symbol>
    </defs>
  `

  // Add to document body once
  document.body.appendChild(svg)
  return svg
}

// Call this once when the app initializes
let spritesCreated = false
const ensureSpritesExist = () => {
  if (!spritesCreated) {
    createSvgSprites()
    spritesCreated = true
  }
}

// Then, update createPinMarker to use the sprite
const createPinMarker = (color: string, isSelected: boolean): SVGElement => {
  ensureSpritesExist()

  const svg = document.createElementNS(SVG_NS, 'svg')
  const scale = isSelected ? 1.5 : 1
  svg.setAttribute('viewBox', '0 0 64 64')
  svg.setAttribute('width', `${64 * scale}`)
  svg.setAttribute('height', `${64 * scale}`)

  const use = document.createElementNS(SVG_NS, 'use')
  use.setAttribute('href', '#pin-marker')
  use.setAttribute('fill', color)
  use.setAttribute('stroke', '#000000')
  use.setAttribute('stroke-width', isSelected ? '1' : '0.5')
  use.setAttribute('stroke-opacity', '0.3')

  svg.appendChild(use)

  // Style the inner ring
  const innerRingStyle = document.createElementNS(SVG_NS, 'style')
  innerRingStyle.textContent = `.inner-ring { stroke: ${lightenColor(color, 0.8)}; stroke-width: 0.75; }`
  svg.appendChild(innerRingStyle)

  return svg
}

// Make the function async since we need to fetch emoji URLs
export const createActiveMarkerSvg = async (
  color: string,
  place: Place,
  isSelected = false,
): Promise<SVGElement> => {
  try {
    if (place.lists?.[0]?.emoji) {
      // Get emoji SVG from cache or create a new one
      const svg = await getEmojiSvg(place.lists[0].emoji)

      if (svg) {
        // Apply styling based on current marker state
        styleEmojiSvg(svg, color, isSelected, place.lists.length > 1)

        return svg
      }
    }

    return createPinMarker(color, isSelected)
  } catch (error) {
    console.error('Error creating active marker SVG:', {
      error: error instanceof Error ? error.message : String(error),
      place,
      color,
    })
    return createPinMarker(color, isSelected)
  }
}
