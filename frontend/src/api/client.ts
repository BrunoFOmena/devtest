const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000" //URL da API (env ou padrao)

export class ApiError extends Error { //erro HTTP tipado da API
  status: number //status code (404, 422...)

  constructor(status: number, message: string) {
    super(message) //mensagem legivel
    this.status = status
  }
}

/** Extrai mensagem legivel de { error } ou { errors } — exportada para testes. */
export function extractMessage(body: unknown): string { //tira texto de { error } ou { errors }
  if (body && typeof body === "object") {
    const data = body as Record<string, unknown>
    if (typeof data.error === "string") return data.error //ex.: "Not found" / "abrir nova caixa"
    if (data.errors && typeof data.errors === "object") { //erros de validacao por campo
      return Object.entries(data.errors as Record<string, string[]>)
        .map(([field, messages]) => `${field}: ${messages.join(", ")}`) //"name: can't be blank"
        .join("; ")
    }
  }
  return "Erro inesperado na API" //fallback
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> { //cliente HTTP fino
  const response = await fetch(`${BASE_URL}${path}`, { //chama a API
    ...options,
    headers: {
      "Content-Type": "application/json", //sempre JSON
      ...options.headers,
    },
  })

  if (response.status === 204) { //DELETE sem corpo
    return undefined as T
  }

  const body = await response.json().catch(() => null) //parse JSON (ou null se falhar)

  if (!response.ok) { //4xx/5xx → lanca ApiError
    throw new ApiError(response.status, extractMessage(body))
  }

  return body as T //sucesso: devolve o JSON tipado
}
