require "test_helper" #carrega setup global

class SamplesTest < ActionDispatch::IntegrationTest #API de amostras
  fixtures [] #nao usa fixtures YAML

  setup do
    @box = create_box(rows: 2, columns: 2) #caixa 2x2 pra todos
  end

  test "suggest retorna A1 em caixa vazia" do #POST suggest
    post suggest_samples_url, as: :json #pede sugestao

    assert_response :success #200

    body = JSON.parse(response.body) #parse
    assert_equal "A1", body["label"] #primeira livre
    assert_includes body["path"], "A1" #path tem label
    assert_includes body["path"], "Caixa" #path tem caixa
  end

  test "suggest retorna erro quando nao ha vaga" do #caixa cheia
    occupy(@box, "A", 1) #enche A1
    occupy(@box, "A", 2) #enche A2
    occupy(@box, "B", 1) #enche B1
    occupy(@box, "B", 2) #enche B2

    post suggest_samples_url, as: :json #pede sugestao

    assert_response :unprocessable_entity #422
    assert_equal SampleAllocator::FULL_MESSAGE, JSON.parse(response.body)["error"] #msg cheia
  end

  test "create grava amostra na posicao sugerida" do #POST create
    assert_difference -> { Sample.count }, 1 do #espera +1
      post samples_url,
           params: {
             sample: {
               codigo_amostra: "AMO-100", #codigo unico
               paciente_nome: "Maria",
               material: "DNA"
             }
           },
           as: :json
    end

    assert_response :created #201

    body = JSON.parse(response.body) #parse
    assert_equal "AMO-100", body["codigo_amostra"] #codigo gravado
    assert_equal "A1", body["label"] #alocou A1
    assert_equal "Maria", body["paciente_nome"] #paciente ok
  end

  test "create rejeita codigo duplicado" do #uniqueness
    occupy(@box, "A", 1, codigo_amostra: "AMO-DUP") #ja existe

    post samples_url,
         params: {
           sample: {
             codigo_amostra: "AMO-DUP", #mesmo codigo
             paciente_nome: "Joao",
             material: "DNA"
           }
         },
         as: :json

    assert_response :unprocessable_entity #422
  end

  test "index lista amostras com localizacao" do #GET index
    occupy(@box, "A", 1, codigo_amostra: "AMO-LIST", paciente_nome: "Ana") #uma amostra

    get samples_url, as: :json #lista

    assert_response :success #200

    body = JSON.parse(response.body) #parse
    assert_equal 1, body.length #uma na lista
    assert_equal "AMO-LIST", body.first["codigo_amostra"] #codigo
    assert_equal "A1", body.first["label"] #localizacao
  end

  test "search encontra por codigo" do #GET search q=codigo
    occupy(@box, "A", 1, codigo_amostra: "BUSCA-001", paciente_nome: "Carlos") #alvo

    get search_samples_url(q: "BUSCA"), as: :json #busca parcial

    assert_response :success #200

    body = JSON.parse(response.body) #parse
    assert_equal 1, body.length #achou um
    assert_equal "BUSCA-001", body.first["codigo_amostra"] #codigo certo
  end

  test "search encontra por paciente" do #GET search q=nome
    occupy(@box, "A", 2, codigo_amostra: "AMO-200", paciente_nome: "Fernanda Silva") #alvo

    get search_samples_url(q: "fernanda"), as: :json #case insensitive

    assert_response :success #200
    assert_equal "Fernanda Silva", JSON.parse(response.body).first["paciente_nome"] #achou
  end

  test "search retorna vazio sem query" do #q ausente
    get search_samples_url, as: :json #sem q

    assert_response :success #200
    assert_equal [], JSON.parse(response.body) #nada
  end

  test "search retorna vazio com query em branco" do #q so espacos
    occupy(@box, "A", 1, codigo_amostra: "AMO-BLANK") #existe amostra

    get search_samples_url(q: "   "), as: :json #query em branco

    assert_response :success #200
    assert_equal [], JSON.parse(response.body) #ignora blank
  end

  test "create aceita concentracao vazia" do #allow_nil
    post samples_url,
         params: {
           sample: {
             codigo_amostra: "AMO-NIL",
             paciente_nome: "Maria",
             material: "DNA",
             concentracao_ng_ul: nil #pode ser nil
           }
         },
         as: :json

    assert_response :created #201
    assert_nil JSON.parse(response.body)["concentracao_ng_ul"] #ficou nil
  end

  test "create rejeita concentracao negativa" do #>= 0
    post samples_url,
         params: {
           sample: {
             codigo_amostra: "AMO-NEG",
             paciente_nome: "Maria",
             material: "DNA",
             concentracao_ng_ul: -0.1 #invalida
           }
         },
         as: :json

    assert_response :unprocessable_entity #422
    assert JSON.parse(response.body).key?("errors") #tem errors
  end

  test "create rejeita body vazio" do #params sem sample
    post samples_url, params: {}, as: :json #body vazio

    assert_response :unprocessable_entity #422
    assert JSON.parse(response.body).key?("error") #erro generico
  end

  test "create ignora position_id enviado no body" do #alocacao so pelo allocator
    other_box = create_box(rows: 1, columns: 1, name: "Outra") #caixa extra
    forced_position = other_box.positions.first #tenta forcar

    post samples_url,
         params: {
           sample: {
             codigo_amostra: "AMO-FORCE",
             paciente_nome: "Maria",
             material: "DNA",
             position_id: forced_position.id #cliente manda id
           }
         },
         as: :json

    assert_response :created #201
    body = JSON.parse(response.body) #parse
    assert_equal "A1", body["label"] #alocou first-fit
    assert_equal @box.name, body["box"] #caixa do setup
    assert_not_equal forced_position.id, body["position_id"] #ignorou o force
  end

  test "create retorna erro quando nao ha vaga" do #caixa cheia no create
    occupy(@box, "A", 1) #enche
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

    assert_response :unprocessable_entity #422
    assert_equal SampleAllocator::FULL_MESSAGE, JSON.parse(response.body)["error"] #msg cheia
  end

  test "suggest com escopo de sala restringe a sugestao" do #room_id
    other_box = create_box(rows: 1, columns: 1, created_at: 3.days.ago, name: "Fora do escopo") #fora
    room = @box.drawer.freezer.room #sala do setup

    post suggest_samples_url(room_id: room.id), as: :json #escopo sala

    assert_response :success #200
    body = JSON.parse(response.body) #parse
    assert_equal @box.name, body["box"] #caixa do escopo
    assert_not_equal other_box.name, body["box"] #nao pega fora
  end

  test "create com escopo grava na caixa escolhida" do #box_id no create
    _older_box = create_box(rows: 1, columns: 1, created_at: 3.days.ago, name: "Mais antiga") #global

    post samples_url(box_id: @box.id), #forca caixa
         params: {
           sample: {
             codigo_amostra: "AMO-SCOPE",
             paciente_nome: "Maria",
             material: "DNA"
           }
         },
         as: :json

    assert_response :created #201
    assert_equal @box.name, JSON.parse(response.body)["box"] #gravou no escopo
  end

  test "suggest nao cria amostra" do #so sugere
    assert_no_difference -> { Sample.count } do #count igual
      post suggest_samples_url, as: :json #suggest
    end

    assert_response :success #200
  end

  test "create rejeita codigo vazio" do #validacao
    post samples_url,
         params: {
           sample: {
             codigo_amostra: "", #vazio
             paciente_nome: "Maria",
             material: "DNA"
           }
         },
         as: :json

    assert_response :unprocessable_entity #422
  end
end
