import type { EmailQualityEnum } from '../../../../shared'

type EmailQualityType = (typeof EmailQualityEnum.options)[number]

/**
 * Maps Icypeas email certainty levels to our internal quality enum
 * @param certainty - The certainty level from Icypeas API
 * @returns The corresponding quality level for our system
 */
export const mapEmailCertaintyToQuality = (
  certainty: string,
): EmailQualityType => {
  switch (certainty) {
    case 'very_sure':
    case 'ultra_sure':
      return 'good'
    case 'probable':
      return 'risky'
    case 'undeliverable':
      return 'bad'
    default:
      return 'unknown'
  }
}
