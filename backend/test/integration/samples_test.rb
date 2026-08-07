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
end
