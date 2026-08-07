require "test_helper"

class SamplesTest < ActionDispatch::IntegrationTest
  fixtures []

  setup do
    @box = create_box(rows: 2, columns: 2)
  end

  test "suggest retorna A1 em caixa vazia" do
    post suggest_samples_url, as: :json

    assert_response :success

    body = JSON.parse(response.body)
    assert_equal "A1", body["label"]
    assert_includes body["path"], "A1"
    assert_includes body["path"], "Caixa"
  end

  test "suggest retorna erro quando nao ha vaga" do
    occupy(@box, "A", 1)
    occupy(@box, "A", 2)
    occupy(@box, "B", 1)
    occupy(@box, "B", 2)

    post suggest_samples_url, as: :json

    assert_response :unprocessable_entity
    assert_equal SampleAllocator::FULL_MESSAGE, JSON.parse(response.body)["error"]
  end

  test "create grava amostra na posicao sugerida" do
    assert_difference -> { Sample.count }, 1 do
      post samples_url,
           params: {
             sample: {
               codigo_amostra: "AMO-100",
               paciente_nome: "Maria",
               material: "DNA"
             }
           },
           as: :json
    end

    assert_response :created

    body = JSON.parse(response.body)
    assert_equal "AMO-100", body["codigo_amostra"]
    assert_equal "A1", body["label"]
    assert_equal "Maria", body["paciente_nome"]
  end

  test "create rejeita codigo duplicado" do
    occupy(@box, "A", 1, codigo_amostra: "AMO-DUP")

    post samples_url,
         params: {
           sample: {
             codigo_amostra: "AMO-DUP",
             paciente_nome: "Joao",
             material: "DNA"
           }
         },
         as: :json

    assert_response :unprocessable_entity
  end

  test "index lista amostras com localizacao" do
    occupy(@box, "A", 1, codigo_amostra: "AMO-LIST", paciente_nome: "Ana")

    get samples_url, as: :json

    assert_response :success

    body = JSON.parse(response.body)
    assert_equal 1, body.length
    assert_equal "AMO-LIST", body.first["codigo_amostra"]
    assert_equal "A1", body.first["label"]
  end

  test "search encontra por codigo" do
    occupy(@box, "A", 1, codigo_amostra: "BUSCA-001", paciente_nome: "Carlos")

    get search_samples_url(q: "BUSCA"), as: :json

    assert_response :success

    body = JSON.parse(response.body)
    assert_equal 1, body.length
    assert_equal "BUSCA-001", body.first["codigo_amostra"]
  end

  test "search encontra por paciente" do
    occupy(@box, "A", 2, codigo_amostra: "AMO-200", paciente_nome: "Fernanda Silva")

    get search_samples_url(q: "fernanda"), as: :json

    assert_response :success
    assert_equal "Fernanda Silva", JSON.parse(response.body).first["paciente_nome"]
  end

  test "search retorna vazio sem query" do
    get search_samples_url, as: :json

    assert_response :success
    assert_equal [], JSON.parse(response.body)
  end

  test "search retorna vazio com query em branco" do
    occupy(@box, "A", 1, codigo_amostra: "AMO-BLANK")

    get search_samples_url(q: "   "), as: :json

    assert_response :success
    assert_equal [], JSON.parse(response.body)
  end

  test "create aceita concentracao vazia" do
    post samples_url,
         params: {
           sample: {
             codigo_amostra: "AMO-NIL",
             paciente_nome: "Maria",
             material: "DNA",
             concentracao_ng_ul: nil
           }
         },
         as: :json

    assert_response :created
    assert_nil JSON.parse(response.body)["concentracao_ng_ul"]
  end

  test "create rejeita concentracao negativa" do
    post samples_url,
         params: {
           sample: {
             codigo_amostra: "AMO-NEG",
             paciente_nome: "Maria",
             material: "DNA",
             concentracao_ng_ul: -0.1
           }
         },
         as: :json

    assert_response :unprocessable_entity
    assert JSON.parse(response.body).key?("errors")
  end

  test "create rejeita body vazio" do
    post samples_url, params: {}, as: :json

    assert_response :unprocessable_entity
    assert JSON.parse(response.body).key?("error")
  end

  test "create ignora position_id enviado no body" do
    other_box = create_box(rows: 1, columns: 1, name: "Outra")
    forced_position = other_box.positions.first

    post samples_url,
         params: {
           sample: {
             codigo_amostra: "AMO-FORCE",
             paciente_nome: "Maria",
             material: "DNA",
             position_id: forced_position.id
           }
         },
         as: :json

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "A1", body["label"]
    assert_equal @box.name, body["box"]
    assert_not_equal forced_position.id, body["position_id"]
  end

  test "create retorna erro quando nao ha vaga" do
    occupy(@box, "A", 1)
    occupy(@box, "A", 2)
    occupy(@box, "B", 1)
    occupy(@box, "B", 2)

    post samples_url,
         params: {
           sample: {
             codigo_amostra: "AMO-FULL",
             paciente_nome: "Maria",
             material: "DNA"
           }
         },
         as: :json

    assert_response :unprocessable_entity
    assert_equal SampleAllocator::FULL_MESSAGE, JSON.parse(response.body)["error"]
  end

  test "suggest nao cria amostra" do
    assert_no_difference -> { Sample.count } do
      post suggest_samples_url, as: :json
    end

    assert_response :success
  end

  test "create rejeita codigo vazio" do
    post samples_url,
         params: {
           sample: {
             codigo_amostra: "",
             paciente_nome: "Maria",
             material: "DNA"
           }
         },
         as: :json

    assert_response :unprocessable_entity
  end
end
