require "test_helper" #carrega setup global

class CsvSampleImporterTest < ActiveSupport::TestCase #testes do CsvSampleImporter
  fixtures [] #nao usa fixtures YAML

  CSV_HEADER = "sala,freezer,gaveta,caixa,linhas,colunas,posicao,codigo_amostra,paciente_nome,concentracao_ng_ul,material,exame,observacao" #cabecalho padrao

  test "preview separa ok e duplicata amarela" do #classifica linhas
    csv = <<~CSV #csv com duplicata de codigo
      #{CSV_HEADER}
      Sala A,-80,G1,Caixa X,2,2,A1,COD-1,Paciente 1,1.5,DNA,,
      Sala A,-80,G1,Caixa X,2,2,A2,COD-1,Paciente 1b,2,DNA,,
      Sala A,-80,G1,Caixa X,2,2,B1,COD-2,Paciente 2,,Swab,,
    CSV

    result = CsvSampleImporter.preview_csv(csv) #so preview, nao grava

    assert_equal 1, result[:ok].size #so COD-2 ok
    assert_equal "COD-2", result[:ok].first[:data]["codigo_amostra"] #unica unica
    assert_equal 2, result[:rejected].size #duas rejeitadas (dup)
    assert(result[:rejected].all? { |item| item[:status] == "duplicate" }) #status amarelo
  end

  test "import cria hierarquia e amostras" do #grava de verdade
    csv = <<~CSV #uma linha valida
      #{CSV_HEADER}
      Sala Imp,-20,Gav 1,Box Imp,2,2,A1,IMP-001,Ana,10,DNA,EX,obs
    CSV

    preview = CsvSampleImporter.preview_csv(csv) #valida antes
    assert_equal 1, preview[:ok].size #linha pronta

    result = nil #guarda retorno do import
    assert_difference -> { Sample.count }, 1 do #espera +1 amostra
      result = CsvSampleImporter.import!(preview[:ok].map { |item| item[:data] }) #importa ok
    end

    assert_equal 1, result[:imported] #contagem importada
    sample = Sample.find_by!(codigo_amostra: "IMP-001") #busca criada
    assert_equal "A1", "#{sample.position.row}#{sample.position.column}" #posicao certa
    assert_equal "Sala Imp", sample.position.box.drawer.freezer.room.name #hierarquia criada
  end

  test "import rejeita se ainda houver linhas invalidas" do #sala vazia = erro
    assert_raises ArgumentError do #nao deixa passar
      CsvSampleImporter.import!([
        {
          "sala" => "", #sala obrigatoria
          "freezer" => "F",
          "gaveta" => "G",
          "caixa" => "C",
          "posicao" => "A1",
          "codigo_amostra" => "X",
          "paciente_nome" => "P",
          "material" => "DNA"
        }
      ])
    end
  end

  test "preview nega codigo que ja existe no sistema" do #reimport do mesmo CSV
    room = Room.create!(name: "Sala A")
    freezer = room.freezers.create!(name: "-80")
    drawer = freezer.drawers.create!(name: "G1")
    box = drawer.boxes.create!(name: "Caixa X", rows: 2, columns: 2)
    position = box.positions.find_by!(row: "A", column: 1)
    Sample.create!(
      position: position,
      codigo_amostra: "JA-EXISTE",
      paciente_nome: "Paciente",
      material: "DNA"
    )

    csv = <<~CSV
      #{CSV_HEADER}
      Sala A,-80,G1,Caixa X,2,2,B1,JA-EXISTE,Outro,1,DNA,,
      Sala A,-80,G1,Caixa X,2,2,A2,NOVO-OK,Novo,2,DNA,,
    CSV

    result = CsvSampleImporter.preview_csv(csv)

    assert_equal 1, result[:ok].size #so o codigo novo
    assert_equal "NOVO-OK", result[:ok].first[:data]["codigo_amostra"]
    assert_equal 1, result[:rejected].size
    rejected = result[:rejected].first
    assert_equal "exists", rejected[:status] #status de ja presente
    assert(rejected[:reasons].any? { |reason| reason.include?("já está presente") })
    assert(rejected[:reasons].any? { |reason| reason.include?("JA-EXISTE") })
  end
end

