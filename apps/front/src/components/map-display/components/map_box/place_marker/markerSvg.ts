import type { Place } from '@ritchy/types'

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

// Cache the template

const pinMarkerTemplate = (() => {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', '0 0 64 64')
  svg.setAttribute('width', '64')
  svg.setAttribute('height', '64')
  svg.setAttribute('role', 'img')
  svg.setAttribute('aria-label', 'Location marker')

  const path = document.createElementNS(SVG_NS, 'path')
  path.setAttribute(
    'd',
    'M24 8C17.383 8 12 13.383 12 20c0 9 12 20 12 20s12-11 12-20c0-6.617-5.383-12-12-12z',
  )
  svg.appendChild(path)

  const innerRing = document.createElementNS(SVG_NS, 'path')
  innerRing.setAttribute(
    'd',
    'M24 9.5C18.21 9.5 13.5 14.21 13.5 20c0 8.15 10.5 18.5 10.5 18.5S34.5 28.15 34.5 20c0-5.79-4.71-10.5-10.5-10.5z',
  )
  innerRing.setAttribute('fill', 'none')
  svg.appendChild(innerRing)

  return svg
})()

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

// Simplified marker creation function
export const createActiveMarker = (
  color: string,
  place: Place,
  isSelected = false,
): Element => {
  try {
    if (place.lists?.[0]?.emoji) {
      // Create a simple div element instead of complex SVG structure
      const div = document.createElement('div')

      // Set the emoji as text content
      div.textContent = place.lists[0].emoji

      // Store emoji in data attribute for pseudo-element
      div.setAttribute('data-emoji', place.lists[0].emoji)

      // Apply classes for styling
      div.className = `emoji-marker ${isSelected ? 'selected' : ''} ${place.lists.length > 1 ? 'with-badge' : ''}`

      // Set color as CSS variable for styling
      div.style.setProperty('--marker-color', color)

      return div
    }

    return createPinMarker(color, isSelected)
  } catch (error) {
    console.error('Error creating active marker:', error)
    return createPinMarker(color, isSelected)
  }
}

// Optimize createPinMarker to use the template
const createPinMarker = (color: string, isSelected: boolean): SVGElement => {
  const svg = pinMarkerTemplate.cloneNode(true) as SVGElement
  const scale = isSelected ? 1.5 : 1

  // Apply scale to the SVG dimensions
  svg.setAttribute('width', `${64 * scale}`)
  svg.setAttribute('height', `${64 * scale}`)

  const path = svg.firstChild as SVGPathElement
  path.setAttribute('fill', color)
  path.setAttribute('stroke', '#000000')
  path.setAttribute('stroke-width', isSelected ? '1' : '0.5')
  path.setAttribute('stroke-opacity', '0.3')

  const innerRing = svg.lastChild as SVGPathElement
  innerRing.setAttribute('stroke', lightenColor(color, 0.8))
  innerRing.setAttribute('stroke-width', '0.75')

  return svg
}

/**
 * Update an existing emoji marker without recreating it
 */
export const updateEmojiMarker = (
  element: HTMLElement,
  color: string,
  isSelected: boolean,
  hasBadge: boolean,
): void => {
  // Update classes efficiently
  element.classList.toggle('selected', isSelected)
  element.classList.toggle('with-badge', hasBadge)

  // Update color variable
  element.style.setProperty('--marker-color', color)
}
