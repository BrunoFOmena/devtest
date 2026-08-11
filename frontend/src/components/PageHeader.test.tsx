import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import PageHeader from "./PageHeader"

describe("PageHeader", () => {
  it("renderiza eyebrow e titulo", () => {
    render(<PageHeader eyebrow="Amostras" title="Tabela" />)
    expect(screen.getByText("Amostras")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Tabela" })).toBeInTheDocument()
  })

  it("borda: description opcional ausente nao quebra", () => {
    const { container } = render(<PageHeader eyebrow="X" title="Y" />)
    expect(container.querySelectorAll("p")).toHaveLength(1) //so o eyebrow
  })

  it("mostra description quando informada", () => {
    render(
      <PageHeader eyebrow="Ferramentas" title="Importar CSV" description="Ajuda curta." />,
    )
    expect(screen.getByText("Ajuda curta.")).toBeInTheDocument()
  })
})
