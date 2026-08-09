require "test_helper" #carrega setup global

class CsvImportTest < ActionDispatch::IntegrationTest #endpoints de import CSV
  fixtures [] #nao usa fixtures YAML

  test "import_preview classifica csv" do #POST preview
    csv = <<~CSV #duas linhas com mesmo codigo
      sala,freezer,gaveta,caixa,linhas,colunas,posicao,codigo_amostra,paciente_nome,concentracao_ng_ul,material,exame,observacao
      S1,F1,G1,C1,2,2,A1,API-1,P1,1,DNA,,
      S1,F1,G1,C1,2,2,A2,API-1,P1b,1,DNA,,
    CSV

    post import_preview_samples_url, params: { csv: csv }, as: :json #preview

    assert_response :success #200
    body = JSON.parse(response.body) #parse
    assert_equal 0, body["ok"].size #nenhuma ok (dup)
    assert_equal 2, body["rejected"].size #duas rejeitadas
    assert_equal "duplicate", body["rejected"].first["status"] #status dup
  end

  test "import grava linhas ok" do #POST import
    rows = [
      {
        sala: "S-API", #hierarquia nova
        freezer: "F-API",
        gaveta: "G-API",
        caixa: "C-API",
        linhas: "2",
        colunas: "2",
        posicao: "A1",
        codigo_amostra: "API-OK-1", #codigo unico
        paciente_nome: "Bruno",
        concentracao_ng_ul: "3.2",
        material: "DNA",
        exame: nil,
        observacao: nil
      }
    ]

    assert_difference -> { Sample.count }, 1 do #espera +1
      post import_samples_url, params: { rows: rows }, as: :json #importa
    end

    assert_response :created #201
    assert_equal 1, JSON.parse(response.body)["imported"] #contagem
  end
end
