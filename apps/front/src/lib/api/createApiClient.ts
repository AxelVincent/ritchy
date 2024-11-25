interface ApiClientConfig {
  baseUrl: string
  headers?: Record<string, string>
}

export const createApiClient = ({ baseUrl, headers = {} }: ApiClientConfig) => {
  const fetchWithAuth = async (
    endpoint: string,
    options: RequestInit = {},
    token: string | null = null
  ) => {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
        ...options.headers
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `API Error: ${response.status} - ${errorText || response.statusText}`
      )
    }

    return response.json()
  }

  return { fetchWithAuth }
}
