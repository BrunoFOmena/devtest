require "test_helper" #carrega setup global

class RoomsTest < ActionDispatch::IntegrationTest #CRUD de salas pela API
  fixtures [] #nao usa fixtures YAML

  test "lista salas vazias" do #GET index vazio
    get rooms_url, as: :json #lista salas

    assert_response :success #200
    assert_equal [], JSON.parse(response.body) #array vazio
  end

  test "cria sala" do #POST create
    assert_difference -> { Room.count }, 1 do #espera +1
      post rooms_url, params: { room: { name: "Sala 1" } }, as: :json #cria
    end

    assert_response :created #201
    assert_equal "Sala 1", JSON.parse(response.body)["name"] #nome gravado
  end

  test "rejeita sala sem nome" do #validacao
    post rooms_url, params: { room: { name: "" } }, as: :json #nome vazio

    assert_response :unprocessable_entity #422
    assert JSON.parse(response.body).key?("errors") #tem errors
  end

  test "mostra sala existente" do #GET show
    room = Room.create!(name: "Sala 2") #cria direto

    get room_url(room), as: :json #busca por id

    assert_response :success #200
    assert_equal room.id, JSON.parse(response.body)["id"] #mesmo id
  end

  test "retorna 404 para sala inexistente" do #GET show invalido
    get room_url(0), as: :json #id que nao existe

    assert_response :not_found #404
    assert_equal "Not found", JSON.parse(response.body)["error"] #mensagem padrao
  end

  test "atualiza sala" do #PATCH update
    room = Room.create!(name: "Antiga") #nome inicial

    patch room_url(room), params: { room: { name: "Nova" } }, as: :json #renomeia

    assert_response :success #200
    assert_equal "Nova", room.reload.name #nome atualizado
  end

  test "remove sala" do #DELETE soft delete
    room = Room.create!(name: "Remover") #alvo

    assert_no_difference -> { Room.count } do #nao apaga de verdade
      delete room_url(room), as: :json #manda pra lixeira
    end

    assert_response :no_content #204
    assert room.reload.discarded? #soft deleted
    assert_equal 0, Room.kept.count #some do kept
  end

  test "remove sala move hierarquia para lixeira pela API" do #cascata soft delete
    box = create_box(rows: 1, columns: 1) #monta hierarquia
    occupy(box, "A", 1, codigo_amostra: "ROOM-DEL-001") #amostra ligada
    room = box.drawer.freezer.room #sala raiz

    delete room_url(room), as: :json #descarta sala

    assert_response :no_content #204
    assert_equal 0, Room.kept.count #sala na lixeira
    assert_equal 0, Freezer.kept.count #freezer tambem
    assert_equal 0, Drawer.kept.count #gaveta tambem
    assert_equal 0, Box.kept.count #caixa tambem
    assert Sample.exists?(codigo_amostra: "ROOM-DEL-001") #amostra fica no banco
  end

  test "rejeita create com body vazio" do #params sem room
    post rooms_url, params: {}, as: :json #body vazio

    assert_response :unprocessable_entity #422
    assert JSON.parse(response.body).key?("error") #erro generico
  end
end
