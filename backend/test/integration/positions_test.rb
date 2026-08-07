require "test_helper"

class PositionsTest < ActionDispatch::IntegrationTest
  fixtures []

  setup do
    @box = create_box(rows: 2, columns: 2)
  end

  test "lista grade da caixa com celulas vazias" do
    get box_positions_url(@box), as: :json

    assert_response :success

    body = JSON.parse(response.body)
    assert_equal 4, body.length
    assert body.all? { |position| position["occupied"] == false }
    assert_equal "A1", body.first["label"]
  end

  test "marca celula ocupada quando tem amostra" do
    occupy(@box, "A", 1, codigo_amostra: "AMO-001", paciente_nome: "Maria")

    get box_positions_url(@box), as: :json

    a1 = JSON.parse(response.body).find { |position| position["label"] == "A1" }
    assert a1["occupied"]
    assert_equal "AMO-001", a1.dig("sample", "codigo_amostra")
  end

  test "retorna 404 para caixa inexistente" do
    get box_positions_url(0), as: :json

    assert_response :not_found
  end

  test "lista grade em ordem linha a linha" do
    get box_positions_url(@box), as: :json

    labels = JSON.parse(response.body).map { |position| position["label"] }
    assert_equal %w[A1 A2 B1 B2], labels
  end

  test "mostra celulas livres e ocupadas na mesma grade" do
    occupy(@box, "A", 1, codigo_amostra: "GRID-001")
    occupy(@box, "B", 2, codigo_amostra: "GRID-002")

    get box_positions_url(@box), as: :json

    body = JSON.parse(response.body)
    by_label = body.index_by { |position| position["label"] }

    assert by_label["A1"]["occupied"]
    assert_not by_label["A2"]["occupied"]
    assert_not by_label["B1"]["occupied"]
    assert by_label["B2"]["occupied"]
    assert_nil by_label["A2"]["sample"]
  end
end
