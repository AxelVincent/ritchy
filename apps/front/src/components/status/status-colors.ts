import type { StatusType } from '@ritchy/types'

export const getStatusColor = (
  status: StatusType,
  format: 'tailwind' | 'hex' = 'tailwind',
): string => {
  if (format === 'hex') {
    switch (status) {
      case 'NEW':
        return '#60a5fa' // blue-400
      case 'NO_ANSWER':
        return '#9ca3af' // gray-400
      case 'CONTACTED':
        return '#c084fc' // purple-400
      case 'FOLLOW_UP':
        return '#fb923c' // orange-400
      case 'MEETING':
        return '#4ade80' // green-400
      case 'IN_PROGRESS':
        return '#facc15' // yellow-400
      case 'WON':
        return '#34d399' // emerald-400
      case 'LOST':
        return '#f87171' // red-400
      default:
        return '#9ca3af' // gray-400
    }
  }

  // Original tailwind classes
  switch (status) {
    case 'NEW':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'NO_ANSWER':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    case 'CONTACTED':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'FOLLOW_UP':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'MEETING':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'IN_PROGRESS':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'WON':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'LOST':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}
