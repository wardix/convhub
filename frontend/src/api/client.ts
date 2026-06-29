export class ApiError extends Error {
  status: number
  data: unknown

  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.status = status
    this.data = data
    this.name = 'ApiError'
  }
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

// biome-ignore lint/suspicious/noExplicitAny: generic transformation
function transformKeysToSnake(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeysToSnake(item))
  }

  // biome-ignore lint/suspicious/noExplicitAny: generic transformation
  const snakeObj: Record<string, any> = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = camelToSnake(key)
      snakeObj[snakeKey] = transformKeysToSnake(obj[key])
    }
  }
  return snakeObj
}

async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `/api${endpoint}`
  const isFormData = options.body instanceof FormData

  const headers = new Headers(options.headers)
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const config = {
    ...options,
    headers,
    credentials: 'include' as RequestCredentials,
  }

  try {
    let response = await fetch(url, config)

    // Handle 401 Unauthorized (attempt token refresh)
    if (response.status === 401) {
      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (refreshResponse.ok) {
        // Retry original request
        response = await fetch(url, config)
      } else {
        // Refresh failed, user is logged out
        throw new ApiError(401, 'Unauthorized')
      }
    }

    if (response.status === 204) {
      return null as unknown as T
    }

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new ApiError(response.status, data.error || 'API Error', data)
    }

    return data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(
      500,
      error instanceof Error ? error.message : 'Unknown error',
    )
  }
}

export const api = {
  get: <T = unknown>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: 'GET' }),
  post: <T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit,
  ) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body:
        body instanceof FormData
          ? body
          : JSON.stringify(transformKeysToSnake(body)),
    }),
  put: <T = unknown>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body:
        body instanceof FormData
          ? body
          : JSON.stringify(transformKeysToSnake(body)),
    }),
  delete: <T = unknown>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),
}
