import type { ApiError } from "../api/client" //erro tipado da API
import type { AllocationScope, Location } from "../types/api" //tipos de escopo e local

/** Detecta 422 de codigo_amostra ja cadastrado (mensagens PT/EN do Rails). */
export function isDuplicateCodigo(error: ApiError): boolean {
  return (
    error.status === 422 &&
    /codigo_amostra/i.test(error.message) &&
    /already been taken|taken|já está em uso|em uso/i.test(error.message)
  )
}

/** Monta o escopo do first-fit a partir do payload de localizacao. */
export function scopeFromLocation(location: Location): AllocationScope {
  return {
    room_id: location.room_id,
    freezer_id: location.freezer_id,
    drawer_id: location.drawer_id,
    box_id: location.box_id,
  }
}
