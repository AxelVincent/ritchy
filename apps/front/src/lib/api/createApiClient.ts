interface ApiClientConfig {
  baseUrl: string
  headers?: Record<string, string>
}

export const createApiClient = ({ baseUrl, headers = {} }: ApiClientConfig) => {
  const fetchWithAuth = async <T>(
    endpoint: string,
    options: RequestInit = {},
    token: string | null = null,
  ): Promise<T> => {
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
      ...(options.headers as Record<string, string>),
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: requestHeaders,
    })

    const data = await response.json()

    if (!response.ok) {
      // Handle structured API errors
      if (data && (data.error || data.message || data.details)) {
        throw {
          status: response.status,
          error: data.error,
          message: data.message || data.error,
          details: data.details,
        }
      }

      // Fallback for unstructured errors
      throw {
        status: response.status,
        error: 'ApiError',
        message: response.statusText,
      }
    }

    return data
  }

  return { fetchWithAuth }
}
