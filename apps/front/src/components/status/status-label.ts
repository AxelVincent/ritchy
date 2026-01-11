import type { StatusType } from '@api/shared'

/**
 * Converts a status code to a human-readable label
 */
export const getStatusLabel = (status: StatusType): string => {
  switch (status) {
    case 'NEW':
      return 'New'
    case 'NO_ANSWER':
      return 'No Answer'
    case 'CONTACTED':
      return 'Contacted'
    case 'FOLLOW_UP':
      return 'Follow Up'
    case 'MEETING':
      return 'Meeting'
    case 'INTERESTED':
      return 'Interested'
    case 'WON':
      return 'Won'
    case 'LOST':
      return 'Lost'
    default:
      return status
  }
}
