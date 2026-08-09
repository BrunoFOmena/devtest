require "test_helper" #carrega setup global

class FreezersTest < ActionDispatch::IntegrationTest #CRUD de freezers pela API
  fixtures [] #nao usa fixtures YAML

  setup do
    @room = Room.create!(name: "Sala 1") #sala pai pra todos os testes
  end

  test "lista freezers da sala" do #GET index
    get room_freezers_url(@room), as: :json #lista nested

    assert_response :success #200
    assert_equal [], JSON.parse(response.body) #ainda vazio
  end

  test "cria freezer na sala" do #POST create
    assert_difference -> { @room.freezers.count }, 1 do #espera +1
      post room_freezers_url(@room), params: { freezer: { name: "Freezer A" } }, as: :json #cria
    end

    assert_response :created #201
    assert_equal "Freezer A", JSON.parse(response.body)["name"] #nome gravado
  end

  test "rejeita freezer sem nome" do #validacao
    post room_freezers_url(@room), params: { freezer: { name: "" } }, as: :json #nome vazio

    assert_response :unprocessable_entity #422
  end

  test "mostra freezer da sala" do #GET show
    freezer = @room.freezers.create!(name: "Freezer B") #cria direto

    get room_freezer_url(@room, freezer), as: :json #busca nested

    assert_response :success #200
    assert_equal freezer.id, JSON.parse(response.body)["id"] #mesmo id
  end

  test "atualiza freezer" do #PATCH rename
    freezer = @room.freezers.create!(name: "Antigo") #nome inicial

    patch room_freezer_url(@room, freezer), params: { freezer: { name: "Novo" } }, as: :json #renomeia

    assert_response :success #200
    assert_equal "Novo", freezer.reload.name #nome atualizado
  end

  test "move freezer para outra sala" do #PATCH com room_id
    other = Room.create!(name: "Sala 2") #destino
    freezer = @room.freezers.create!(name: "Movel") #alvo

    patch room_freezer_url(@room, freezer),
          params: { freezer: { room_id: other.id } }, #troca de sala
          as: :json

    assert_response :success #200
    freezer.reload #recarrega
    assert_equal other.id, freezer.room_id #room novo
    assert_includes other.freezers.kept, freezer #aparece no destino
    assert_not_includes @room.freezers.kept, freezer #sai da origem
  end


  test "remove freezer" do #DELETE soft delete
    freezer = @room.freezers.create!(name: "Remover") #alvo

    assert_difference -> { Freezer.count }, -1 do #apaga do banco
      delete room_freezer_url(@room, freezer), as: :json #exclusao definitiva (MVP)
    end

    assert_response :no_content #204
    assert_nil Freezer.find_by(id: freezer.id) #nao existe mais
  end

end
