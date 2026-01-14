import type { StatusType } from '@api/shared'

export const getStatusColor = (
  status: StatusType,
  format: 'tailwind' | 'hex' = 'tailwind',
): string => {
  if (format === 'hex') {
    switch (status) {
      case 'NEW':
        return '#60a5fa' // blue-400 - More vibrant blue
      case 'NO_ANSWER':
        return '#9ca3af' // gray-400 - More vibrant gray
      case 'CONTACTED':
        return '#fbbf24' // amber-400 - More vibrant amber
      case 'FOLLOW_UP':
        return '#fb923c' // orange-400 - More vibrant orange
      case 'MEETING':
        return '#a78bfa' // violet-400 - More vibrant violet
      case 'INTERESTED':
        return '#22d3ee' // cyan-400 - More vibrant cyan
      case 'WON':
        return '#4ade80' // green-400 - More vibrant green
      case 'LOST':
        return '#f87171' // red-400 - More vibrant red
      default:
        return '#9ca3af' // gray-400 - More vibrant default gray
    }
  }

  // Tailwind classes with improved contrast and professional appearance
  switch (status) {
    case 'NEW':
      return 'bg-blue-200 text-blue-800 border-blue-300 dark:bg-blue-400 dark:text-black dark:border-blue-500'
    case 'NO_ANSWER':
      return 'bg-gray-300 text-gray-800 border-gray-400 dark:bg-gray-400 dark:text-black dark:border-gray-500'
    case 'CONTACTED':
      return 'bg-amber-200 text-amber-800 border-amber-300 dark:bg-amber-400 dark:text-black dark:border-amber-400'
    case 'FOLLOW_UP':
      return 'bg-orange-200 text-orange-800 border-orange-300 dark:bg-orange-400 dark:text-black dark:border-orange-400'
    case 'MEETING':
      return 'bg-violet-200 text-violet-800 border-violet-300 dark:bg-violet-400 dark:text-black dark:border-violet-400'
    case 'INTERESTED':
      return 'bg-cyan-200 text-cyan-800 border-cyan-300 dark:bg-cyan-500 dark:text-black dark:border-cyan-500'
    case 'WON':
      return 'bg-green-200 text-green-900 border-green-300 dark:bg-green-400 dark:text-black dark:border-green-400'
    case 'LOST':
      return 'bg-red-200 text-red-800 border-red-300 dark:bg-red-400 dark:text-black dark:border-red-400'
    default:
      return 'bg-gray-200 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600'
  }
}
