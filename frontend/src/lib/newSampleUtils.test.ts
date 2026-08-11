import { describe, expect, it } from "vitest"
import { ApiError } from "../api/client"
import { makeLocation } from "../test/fixtures"
import { isDuplicateCodigo, scopeFromLocation } from "./newSampleUtils"

describe("isDuplicateCodigo", () => {
  it("detecta 422 taken em ingles", () => {
    const error = new ApiError(422, "codigo_amostra: has already been taken")
    expect(isDuplicateCodigo(error)).toBe(true)
  })

  it("detecta 422 em portugues", () => {
    const error = new ApiError(422, "codigo_amostra já está em uso")
    expect(isDuplicateCodigo(error)).toBe(true)
  })

  it("borda: 422 abrir nova caixa nao e duplicata", () => {
    const error = new ApiError(422, "abrir nova caixa")
    expect(isDuplicateCodigo(error)).toBe(false)
  })

  it("borda: 404 ou outro status", () => {
    expect(isDuplicateCodigo(new ApiError(404, "codigo_amostra taken"))).toBe(false)
    expect(isDuplicateCodigo(new ApiError(500, "codigo_amostra taken"))).toBe(false)
  })

  it("borda: 422 sem mencionar codigo_amostra", () => {
    expect(isDuplicateCodigo(new ApiError(422, "name has already been taken"))).toBe(false)
  })
})

describe("scopeFromLocation", () => {
  it("copia os ids da hierarquia", () => {
    const location = makeLocation({
      room_id: 1,
      freezer_id: 2,
      drawer_id: 3,
      box_id: 4,
    })
    expect(scopeFromLocation(location)).toEqual({
      room_id: 1,
      freezer_id: 2,
      drawer_id: 3,
      box_id: 4,
    })
  })
})
