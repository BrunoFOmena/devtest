require "test_helper" #carrega setup global

class DrawersTest < ActionDispatch::IntegrationTest #CRUD de gavetas pela API
  fixtures [] #nao usa fixtures YAML

  setup do
    room = Room.create!(name: "Sala 1") #sala pai
    @freezer = room.freezers.create!(name: "Freezer A") #freezer pai
  end

  test "lista gavetas do freezer" do #GET index
    get freezer_drawers_url(@freezer), as: :json #lista nested

    assert_response :success #200
    assert_equal [], JSON.parse(response.body) #ainda vazio
  end

  test "cria gaveta no freezer" do #POST create
    assert_difference -> { @freezer.drawers.count }, 1 do #espera +1
      post freezer_drawers_url(@freezer), params: { drawer: { name: "Gaveta 1" } }, as: :json #cria
    end

    assert_response :created #201
    assert_equal "Gaveta 1", JSON.parse(response.body)["name"] #nome gravado
  end

  test "rejeita gaveta sem nome" do #validacao
    post freezer_drawers_url(@freezer), params: { drawer: { name: "" } }, as: :json #nome vazio

    assert_response :unprocessable_entity #422
  end

  test "mostra gaveta do freezer" do #GET show
    drawer = @freezer.drawers.create!(name: "Gaveta 2") #cria direto

    get freezer_drawer_url(@freezer, drawer), as: :json #busca nested

    assert_response :success #200
    assert_equal drawer.id, JSON.parse(response.body)["id"] #mesmo id
  end

  test "atualiza gaveta" do #PATCH rename
    drawer = @freezer.drawers.create!(name: "Antiga") #nome inicial

    patch freezer_drawer_url(@freezer, drawer), params: { drawer: { name: "Nova" } }, as: :json #renomeia

    assert_response :success #200
    assert_equal "Nova", drawer.reload.name #nome atualizado
  end

  test "move gaveta para outro freezer" do #PATCH com freezer_id
    other = @freezer.room.freezers.create!(name: "Freezer B") #destino
    drawer = @freezer.drawers.create!(name: "Movel") #alvo

    patch freezer_drawer_url(@freezer, drawer),
          params: { drawer: { freezer_id: other.id } }, #troca de freezer
          as: :json

    assert_response :success #200
    drawer.reload #recarrega
    assert_equal other.id, drawer.freezer_id #freezer novo
    assert_includes other.drawers.kept, drawer #aparece no destino
    assert_not_includes @freezer.drawers.kept, drawer #sai da origem
  end


  test "remove gaveta" do #DELETE soft delete
    drawer = @freezer.drawers.create!(name: "Remover") #alvo

    assert_no_difference -> { Drawer.count } do #nao apaga de verdade
      delete freezer_drawer_url(@freezer, drawer), as: :json #manda pra lixeira
    end

    assert_response :no_content #204
    assert drawer.reload.discarded? #soft deleted
  end
end
