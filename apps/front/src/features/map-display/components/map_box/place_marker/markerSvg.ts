import type { Place } from '@ritchy/types'

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
): SVGElement => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 32')
  svg.setAttribute('width', '28')
  svg.setAttribute('height', '32')

  // Main marker path
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute(
    'd',
    'M12 0C5.383 0 0 5.383 0 12c0 9 12 20 12 20s12-11 12-20c0-6.617-5.383-12-12-12z',
  )
  path.setAttribute('fill', color)
  path.setAttribute('stroke', '#000000')
  path.setAttribute('stroke-width', '0.5')
  path.setAttribute('stroke-opacity', '0.3')
  svg.appendChild(path)

  // Create foreignObject for the primary emoji
  const foreignObject = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'foreignObject',
  )
  foreignObject.setAttribute('x', '4')
  foreignObject.setAttribute('y', '4')
  foreignObject.setAttribute('width', '16')
  foreignObject.setAttribute('height', '16')

  const emojiContainer = document.createElement('div')
  emojiContainer.style.width = '100%'
  emojiContainer.style.height = '100%'
  emojiContainer.style.display = 'flex'
  emojiContainer.style.alignItems = 'center'
  emojiContainer.style.justifyContent = 'center'
  emojiContainer.style.fontSize = '14px'

  // Show first list emoji if available
  if (place.associatedLists?.[0]) {
    emojiContainer.textContent = place.associatedLists[0].emoji
  }

  foreignObject.appendChild(emojiContainer)
  svg.appendChild(foreignObject)

  // Only add badge if there are more than one associated lists
  if (place.associatedLists && place.associatedLists.length > 1) {
    // Badge circle - smaller radius and adjusted position
    const badge = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle',
    )
    badge.setAttribute('cx', '17') // Moved slightly left
    badge.setAttribute('cy', '5') // Moved slightly up
    badge.setAttribute('r', '4') // Reduced from 6 to 4
    badge.setAttribute('fill', '#FFFFFF')
    badge.setAttribute('stroke', '#000000')
    badge.setAttribute('stroke-width', '0.5')
    badge.setAttribute('stroke-opacity', '0.3')
    badge.setAttribute('opacity', '0.7')

    // Badge text - smaller font and adjusted position
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    text.setAttribute('x', '17') // Matches circle cx
    text.setAttribute('y', '7') // Adjusted for new circle position
    text.setAttribute('text-anchor', 'middle')
    text.setAttribute('fill', '#000000')
    text.setAttribute('font-size', '6px') // Reduced from 8px to 6px
    text.textContent = '+'

    svg.appendChild(badge)
    svg.appendChild(text)
  }

  // Add inner white ring
  const innerRing = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path',
  )
  innerRing.setAttribute(
    'd',
    'M12 1.5C6.21 1.5 1.5 6.21 1.5 12c0 8.15 10.5 18.5 10.5 18.5S22.5 20.15 22.5 12c0-5.79-4.71-10.5-10.5-10.5z',
  )
  innerRing.setAttribute('fill', 'none')
  innerRing.setAttribute('stroke', '#ffffff')
  innerRing.setAttribute('stroke-width', '0.5')
  innerRing.setAttribute('stroke-opacity', '0.9')
  svg.appendChild(innerRing)

  return svg
}
