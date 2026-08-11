import { afterEach, describe, expect, it, vi } from "vitest"
import { ApiError, extractMessage, request } from "./client"

describe("extractMessage", () => {
  it("lê error string simples", () => {
    expect(extractMessage({ error: "abrir nova caixa" })).toBe("abrir nova caixa")
  })

  it("formata errors por campo", () => {
    expect(
      extractMessage({
        errors: {
          codigo_amostra: ["has already been taken"],
          name: ["can't be blank"],
        },
      }),
    ).toBe("codigo_amostra: has already been taken; name: can't be blank")
  })

  it("borda: body null/undefined/array → fallback", () => {
    expect(extractMessage(null)).toBe("Erro inesperado na API")
    expect(extractMessage(undefined)).toBe("Erro inesperado na API")
    expect(extractMessage([])).toBe("Erro inesperado na API")
  })

  it("borda: error nao-string e sem errors → fallback", () => {
    expect(extractMessage({ error: 422 })).toBe("Erro inesperado na API")
    expect(extractMessage({ foo: "bar" })).toBe("Erro inesperado na API")
  })
})

describe("request", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("retorna JSON em sucesso", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({ id: 1 }),
      }),
    )

    await expect(request<{ id: number }>("/samples")).resolves.toEqual({ id: 1 })
  })

  it("borda: 204 sem corpo → undefined", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 204,
        ok: true,
        json: async () => {
          throw new Error("sem corpo")
        },
      }),
    )

    await expect(request("/samples/1", { method: "DELETE" })).resolves.toBeUndefined()
  })

  it("borda: 422 com error → ApiError tipado", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 422,
        ok: false,
        json: async () => ({ error: "abrir nova caixa" }),
      }),
    )

    const rejection = request("/samples/suggest", { method: "POST" })
    await expect(rejection).rejects.toBeInstanceOf(ApiError)
    await expect(rejection).rejects.toMatchObject({
      status: 422,
      message: "abrir nova caixa",
    })
  })

  it("borda: JSON invalido em erro → fallback de mensagem", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 500,
        ok: false,
        json: async () => {
          throw new Error("invalid json")
        },
      }),
    )

    await expect(request("/boom")).rejects.toMatchObject({
      status: 500,
      message: "Erro inesperado na API",
    })
  })
})
