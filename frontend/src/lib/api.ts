export type ApiError = {
  message: string
  status?: number
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    const err: ApiError = {
      message: text || `Request failed: ${response.status}`,
      status: response.status,
    }
    throw err
  }

  return (await response.json()) as T
}
