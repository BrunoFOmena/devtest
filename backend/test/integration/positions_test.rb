require "test_helper" #carrega setup global

class PositionsTest < ActionDispatch::IntegrationTest #grade da caixa pela API
  fixtures [] #nao usa fixtures YAML

  setup do
    @box = create_box(rows: 2, columns: 2) #caixa 2x2 pra todos
  end

  test "lista grade da caixa com celulas vazias" do #GET index vazia
    get box_positions_url(@box), as: :json #lista posicoes

    assert_response :success #200

    body = JSON.parse(response.body) #parse JSON
    assert_equal 4, body.length #2x2 = 4
    assert body.all? { |position| position["occupied"] == false } #todas livres
    assert_equal "A1", body.first["label"] #primeira label
  end

  test "marca celula ocupada quando tem amostra" do #occupied true
    occupy(@box, "A", 1, codigo_amostra: "AMO-001", paciente_nome: "Maria") #ocupa A1

    get box_positions_url(@box), as: :json #lista grade

    a1 = JSON.parse(response.body).find { |position| position["label"] == "A1" } #acha A1
    assert a1["occupied"] #marcada ocupada
    assert_equal "AMO-001", a1.dig("sample", "codigo_amostra") #codigo na celula
  end

  test "retorna 404 para caixa inexistente" do #GET com id invalido
    get box_positions_url(0), as: :json #caixa 0

    assert_response :not_found #404
  end

  test "lista grade em ordem linha a linha" do #A1 A2 B1 B2
    get box_positions_url(@box), as: :json #lista

    labels = JSON.parse(response.body).map { |position| position["label"] } #so labels
    assert_equal %w[A1 A2 B1 B2], labels #ordem row-major
  end

  test "mostra celulas livres e ocupadas na mesma grade" do #mix occupied
    occupy(@box, "A", 1, codigo_amostra: "GRID-001") #ocupa A1
    occupy(@box, "B", 2, codigo_amostra: "GRID-002") #ocupa B2

    get box_positions_url(@box), as: :json #lista grade

    body = JSON.parse(response.body) #parse
    by_label = body.index_by { |position| position["label"] } #indice por label

    assert by_label["A1"]["occupied"] #A1 ocupada
    assert_not by_label["A2"]["occupied"] #A2 livre
    assert_not by_label["B1"]["occupied"] #B1 livre
    assert by_label["B2"]["occupied"] #B2 ocupada
    assert_nil by_label["A2"]["sample"] #livre sem sample
  end
end
