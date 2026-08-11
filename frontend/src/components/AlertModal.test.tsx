import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import AlertModal from "./AlertModal"

describe("AlertModal", () => {
  it("mostra titulo, mensagem e confirma", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(
      <AlertModal
        title="Código já cadastrado"
        message='O código "X" já existe.'
        confirmLabel="Trocar código"
        onConfirm={onConfirm}
      />,
    )

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("Código já cadastrado")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Trocar código" }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it("borda: confirmLabel default OK", () => {
    render(<AlertModal title="Aviso" message="msg" onConfirm={() => undefined} />)
    expect(screen.getByRole("button", { name: "OK" })).toBeInTheDocument()
  })
})
