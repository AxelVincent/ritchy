import { getAppleEmojiUrl } from '@/lib/utils/emojiUtils'

// Cache for rendered emoji SVGs
const emojiSvgCache = new Map<string, SVGElement>()

// SVG namespace constant
const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * Get or create an emoji SVG element
 * @param emoji The emoji character
 * @returns The SVG element for the emoji
 */
export const getEmojiSvg = async (
  emoji: string,
): Promise<SVGElement | null> => {
  // Return from cache if available
  if (emojiSvgCache.has(emoji)) {
    const cachedSvg = emojiSvgCache.get(emoji)
    if (cachedSvg) {
      return cachedSvg.cloneNode(true) as SVGElement
    }
  }

  try {
    // Get emoji URL
    const emojiUrl = await getAppleEmojiUrl(emoji)
    if (!emojiUrl) return null

    // Create template SVG
    const template = document.createElement('template')
    template.innerHTML = `
      <svg viewBox="0 0 36 36" role="img">
        <foreignObject x="0" y="0" width="36" height="36">
          <div xmlns="http://www.w3.org/1999/xhtml" style="position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center">
            <div class="white-layer" style="position:absolute;width:100%;height:100%;display:flex;align-items:center;justify-content:center">
              <img class="emoji-image-white" src="${emojiUrl}" style="width:70%;height:70%;object-fit:contain;" />
            </div>
            <div class="color-layer" style="position:absolute;width:100%;height:100%;display:flex;align-items:center;justify-content:center">
              <img class="emoji-image-color" src="${emojiUrl}" style="width:70%;height:70%;object-fit:contain;" />
            </div>
          </div>
        </foreignObject>
      </svg>
    `

    const svg = template.content.firstElementChild as SVGElement

    // Store in cache
    emojiSvgCache.set(emoji, svg)

    // Return a clone
    return svg.cloneNode(true) as SVGElement
  } catch (error) {
    console.error('Error creating emoji SVG:', error)
    return null
  }
}

/**
 * Apply styling to an emoji SVG
 */
export const styleEmojiSvg = (
  svg: SVGElement,
  color: string,
  isSelected = false,
  badgeNeeded = false,
  baseSize = 36,
): void => {
  // Apply scale based on selection state
  const scale = isSelected ? 1.5 : 1
  svg.setAttribute('width', `${baseSize * scale}`)
  svg.setAttribute('height', `${baseSize * scale}`)

  // Get the emoji layers
  const whiteLayerDiv = svg.querySelector('.white-layer') as HTMLDivElement
  const colorLayerDiv = svg.querySelector('.color-layer') as HTMLDivElement

  if (whiteLayerDiv && colorLayerDiv) {
    // Apply white outline effect
    whiteLayerDiv.style.filter = `
      drop-shadow(-1.5px -1.5px 0 white)
      drop-shadow(1.5px -1.5px 0 white)
      drop-shadow(-1.5px 1.5px 0 white)
      drop-shadow(1.5px 1.5px 0 white)
      drop-shadow(-1.5px 0 0 white)
      drop-shadow(1.5px 0 0 white)
      drop-shadow(0 -1.5px 0 white)
      drop-shadow(0 1.5px 0 white)
    `

    // Apply color shadow effect
    colorLayerDiv.style.filter = `
      drop-shadow(-1px -1px 0 ${color})
      drop-shadow(1px -1px 0 ${color})
      drop-shadow(-1px 1px 0 ${color})
      drop-shadow(1px 1px 0 ${color})
      drop-shadow(-1px 0 0 ${color})
      drop-shadow(1px 0 0 ${color})
      drop-shadow(0 -1px 0 ${color})
      drop-shadow(0 1px 0 ${color})
    `
  }

  // Add badge if needed
  if (badgeNeeded) {
    // Remove any existing badge first
    const existingBadge = svg.querySelector('g')
    if (existingBadge) {
      svg.removeChild(existingBadge)
    }

    // Create and add a new badge
    const badgeGroup = document.createElementNS(SVG_NS, 'g')
    const cx = `${baseSize * 0.75}`
    const cy = `${baseSize * 0.25}`

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
    badgeText.setAttribute('y', `${Number.parseFloat(cy) + 1.5}`)
    badgeText.setAttribute('text-anchor', 'middle')
    badgeText.setAttribute('fill', '#000000')
    badgeText.setAttribute('font-size', '7px')
    badgeText.textContent = '+'
    badgeGroup.appendChild(badgeText)

    svg.appendChild(badgeGroup)
  }
}
