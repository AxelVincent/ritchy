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
  try {
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

    // Create text element for emoji instead of foreignObject
    if (place.lists?.[0]) {
      const text = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'text',
      )
      text.setAttribute('x', '12')
      text.setAttribute('y', '14')
      text.setAttribute('text-anchor', 'middle')
      text.setAttribute('dominant-baseline', 'middle')
      text.setAttribute('font-size', '14')
      text.textContent = place.lists[0].emoji
      svg.appendChild(text)
    }

    // Only add badge if there are more than one associated lists
    if (place.lists && place.lists.length > 1) {
      // Badge circle
      const badge = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle',
      )
      badge.setAttribute('cx', '17')
      badge.setAttribute('cy', '5')
      badge.setAttribute('r', '4')
      badge.setAttribute('fill', '#FFFFFF')
      badge.setAttribute('stroke', '#000000')
      badge.setAttribute('stroke-width', '0.5')
      badge.setAttribute('stroke-opacity', '0.3')
      badge.setAttribute('opacity', '0.7')
      svg.appendChild(badge)

      // Badge text
      const text = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'text',
      )
      text.setAttribute('x', '17')
      text.setAttribute('y', '7')
      text.setAttribute('text-anchor', 'middle')
      text.setAttribute('fill', '#000000')
      text.setAttribute('font-size', '6px')
      text.textContent = '+'
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
  } catch (error) {
    console.error('Error creating active marker SVG:', {
      error: error instanceof Error ? error.message : String(error),
      place,
      color,
    })
    // Return a simple fallback SVG
    const fallbackSvg = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg',
    )
    fallbackSvg.setAttribute('viewBox', '0 0 24 32')
    fallbackSvg.setAttribute('width', '28')
    fallbackSvg.setAttribute('height', '32')

    const fallbackPath = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path',
    )
    fallbackPath.setAttribute(
      'd',
      'M12 0C5.383 0 0 5.383 0 12c0 9 12 20 12 20s12-11 12-20c0-6.617-5.383-12-12-12z',
    )
    fallbackPath.setAttribute('fill', color)
    fallbackSvg.appendChild(fallbackPath)

    return fallbackSvg
  }
}
