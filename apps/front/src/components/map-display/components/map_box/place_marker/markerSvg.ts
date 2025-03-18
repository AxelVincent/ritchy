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

// Create a template for the marker structure
const createMarkerTemplate = () => {
  const template = document.createElement('template')
  template.innerHTML = `
    <svg viewBox="0 0 36 36" role="img">
      <foreignObject x="0" y="0" width="36" height="36">
        <div xmlns="http://www.w3.org/1999/xhtml" style="position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center">
          <div class="white-layer" style="position:absolute;font-size:28px;color:transparent"></div>
          <div class="color-layer" style="position:absolute;font-size:28px;color:white"></div>
        </div>
      </foreignObject>
    </svg>
  `
  return template
}

// Cache the template
const markerTemplate = createMarkerTemplate()

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

// Pure function to create active marker SVG
export const createActiveMarkerSvg = (
  color: string,
  place: Place,
  isSelected = false,
): SVGElement => {
  try {
    if (place.lists?.[0]?.emoji) {
      // Clone the template instead of creating elements
      const svg = markerTemplate.content.firstElementChild?.cloneNode(
        true,
      ) as SVGElement

      // Apply dynamic attributes
      const scale = isSelected ? 1.5 : 1
      const baseSize = 36 // Reduced from 64 to match emoji size better
      svg.setAttribute('width', `${baseSize * scale}`)
      svg.setAttribute('height', `${baseSize * scale}`)
      svg.setAttribute(
        'aria-label',
        `Location marker with ${place.lists[0].emoji}`,
      )

      // Get references to layers
      const colorLayer = svg.querySelector('.color-layer') as HTMLDivElement
      const whiteLayer = svg.querySelector('.white-layer') as HTMLDivElement

      // Set emoji content
      colorLayer.textContent = place.lists[0].emoji
      whiteLayer.textContent = place.lists[0].emoji

      // Keep same font size but scale the color layer
      colorLayer.style.fontSize = '30px'
      whiteLayer.style.fontSize = '30px'

      // Apply text shadows - unchanged
      whiteLayer.style.textShadow = `
        -3.5px -3.5px 0 white,
        3.5px -3.5px 0 white,
        -3.5px 3.5px 0 white,
        3.5px 3.5px 0 white,
        -3.5px 0 0 white,
        3.5px 0 0 white,
        0 -3.5px 0 white,
        0 3.5px 0 white
      `

      colorLayer.style.textShadow = `
        -2.5px -2.5px 0 ${color},
        2.5px -2.5px 0 ${color},
        -2.5px 2.5px 0 ${color},
        2.5px 2.5px 0 ${color},
        -2.5px 0 0 ${color},
        2.5px 0 0 ${color},
        0 -2.5px 0 ${color},
        0 2.5px 0 ${color},
        0 0 8px ${color}
      `

      // Add badge if needed
      if (place.lists.length > 1) {
        addBadgeToMarker(svg, color, baseSize)
      }

      return svg
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

// Separate badge creation
const addBadgeToMarker = (svg: SVGElement, color: string, baseSize = 36) => {
  const badgeGroup = document.createElementNS(SVG_NS, 'g')

  // Common coordinates for all badge elements (adjusted for smaller viewBox)
  const cx = `${baseSize * 0.75}` // Position relative to new base size
  const cy = `${baseSize * 0.25}` // Position relative to new base size

  // White border glow
  const whiteBorderGlow = document.createElementNS(SVG_NS, 'circle')
  whiteBorderGlow.setAttribute('cx', cx)
  whiteBorderGlow.setAttribute('cy', cy)
  whiteBorderGlow.setAttribute('r', '4.5')
  whiteBorderGlow.setAttribute('stroke', 'white')
  whiteBorderGlow.setAttribute('stroke-width', '2')
  whiteBorderGlow.setAttribute('fill', 'none')
  badgeGroup.appendChild(whiteBorderGlow)

  // Colored glow
  const badgeGlow = document.createElementNS(SVG_NS, 'circle')
  badgeGlow.setAttribute('cx', cx)
  badgeGlow.setAttribute('cy', cy)
  badgeGlow.setAttribute('r', '4.5')
  badgeGlow.setAttribute('stroke', color)
  badgeGlow.setAttribute('stroke-width', '1.5')
  badgeGlow.setAttribute('fill', 'none')
  badgeGroup.appendChild(badgeGlow)

  // Badge circle
  const badge = document.createElementNS(SVG_NS, 'circle')
  badge.setAttribute('cx', cx)
  badge.setAttribute('cy', cy)
  badge.setAttribute('r', '4')
  badge.setAttribute('fill', '#FFFFFF')
  badgeGroup.appendChild(badge)

  // Badge text
  const badgeText = document.createElementNS(SVG_NS, 'text')
  badgeText.setAttribute('x', cx)
  badgeText.setAttribute('y', `${Number.parseFloat(cy) + 1.5}`) // Adjusted to match new cy position
  badgeText.setAttribute('text-anchor', 'middle')
  badgeText.setAttribute('fill', '#000000')
  badgeText.setAttribute('font-size', '7px')
  badgeText.textContent = '+'
  badgeGroup.appendChild(badgeText)

  svg.appendChild(badgeGroup)
}
