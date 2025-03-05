import type { StatusType } from '@ritchy/types'

export const getStatusColor = (
  status: StatusType,
  format: 'tailwind' | 'hex' = 'tailwind',
): string => {
  if (format === 'hex') {
    switch (status) {
      case 'NEW':
        return '#ffffff' // white - Clean white for new prospects
      case 'NO_ANSWER':
        return '#9ca3af' // gray-400 - Neutral gray for no response
      case 'CONTACTED':
        return '#fcd34d' // yellow-300 - Softer yellow for initial contact
      case 'FOLLOW_UP':
        return '#fb923c' // orange-400 - Brighter orange for follow-up needed
      case 'MEETING':
        return '#a78bfa' // violet-400 - Brighter purple for scheduled meetings
      case 'INTERESTED':
        return '#60a5fa' // blue-400 - Brighter blue for interested prospects
      case 'WON':
        return '#34d399' // emerald-400 - Brighter green for won deals
      case 'LOST':
        return '#f87171' // red-400 - Brighter red for lost opportunities
      default:
        return '#9ca3af' // gray-400
    }
  }

  // Tailwind classes with improved contrast and professional appearance
  switch (status) {
    case 'NEW':
      return 'bg-white text-gray-800 border-gray-300 dark:bg-gray-100 dark:text-black dark:border-gray-700'
    case 'NO_ANSWER':
      return 'bg-gray-300 text-gray-800 border-gray-400 dark:bg-gray-400 dark:text-black dark:border-gray-500'
    case 'CONTACTED':
      return 'bg-amber-200 text-amber-800 border-amber-300 dark:bg-amber-500 dark:text-black dark:border-amber-400'
    case 'FOLLOW_UP':
      return 'bg-orange-200 text-orange-800 border-orange-300 dark:bg-orange-500 dark:text-black dark:border-orange-400'
    case 'MEETING':
      return 'bg-violet-200 text-violet-800 border-violet-300 dark:bg-violet-500 dark:text-black dark:border-violet-400'
    case 'INTERESTED':
      return 'bg-blue-200 text-blue-800 border-blue-300 dark:bg-blue-500 dark:text-black dark:border-blue-400'
    case 'WON':
      return 'bg-emerald-200 text-emerald-800 border-emerald-300 dark:bg-emerald-500 dark:text-black dark:border-emerald-400'
    case 'LOST':
      return 'bg-red-200 text-red-800 border-red-300 dark:bg-red-500 dark:text-black dark:border-red-400'
    default:
      return 'bg-gray-200 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600'
  }
}
