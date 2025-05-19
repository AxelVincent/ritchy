/**
 * Utility function to construct Google Calendar API URLs
 * Handles the base URL and /web prefix for Google Calendar endpoints
 */
export const getGoogleCalendarUrl = (path: string) => {
  const baseUrl = import.meta.env.VITE_API_WEB_BASE_URL || ''
  // Remove /web prefix if it exists in the path since it's already in the baseUrl
  const cleanPath = path.startsWith('/web') ? path.slice(4) : path
  return `${baseUrl}${cleanPath}`
}
