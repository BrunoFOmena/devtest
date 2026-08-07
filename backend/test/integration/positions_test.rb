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
end
