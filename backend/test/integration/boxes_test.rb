require "test_helper" #carrega setup global

class BoxesTest < ActionDispatch::IntegrationTest #CRUD de caixas pela API
  fixtures [] #nao usa fixtures YAML

  setup do
    room = Room.create!(name: "Sala 1") #sala pai
    freezer = room.freezers.create!(name: "Freezer A") #freezer pai
    @drawer = freezer.drawers.create!(name: "Gaveta 1") #gaveta pai
  end

  test "lista caixas da gaveta" do #GET index
    get drawer_boxes_url(@drawer), as: :json #lista nested

    assert_response :success #200
    assert_equal [], JSON.parse(response.body) #ainda vazio
  end

  test "cria caixa e gera posicoes" do #POST + PositionGenerator
    assert_difference -> { @drawer.boxes.count }, 1 do #espera +1 caixa
      post drawer_boxes_url(@drawer),
           params: { box: { name: "Caixa 1", rows: 2, columns: 3 } }, #2x3
           as: :json
    end

    assert_response :created #201

    box = Box.last #caixa criada
    assert_equal 6, box.positions.count #2*3 = 6 celulas
  end

  test "rejeita caixa com rows invalido" do #rows > 0
    post drawer_boxes_url(@drawer),
         params: { box: { name: "Caixa", rows: 0, columns: 2 } }, #rows zero
         as: :json

    assert_response :unprocessable_entity #422
  end

  test "mostra caixa da gaveta" do #GET show
    box = @drawer.boxes.create!(name: "Caixa 2", rows: 1, columns: 1) #cria direto

    get drawer_box_url(@drawer, box), as: :json #busca nested

    assert_response :success #200
    assert_equal box.id, JSON.parse(response.body)["id"] #mesmo id
  end

  test "atualiza caixa" do #PATCH rename
    box = @drawer.boxes.create!(name: "Antiga", rows: 1, columns: 1) #nome inicial

    patch drawer_box_url(@drawer, box), params: { box: { name: "Nova" } }, as: :json #renomeia

    assert_response :success #200
    assert_equal "Nova", box.reload.name #nome atualizado
  end

  test "move caixa para outra gaveta" do #PATCH com drawer_id
    other = @drawer.freezer.drawers.create!(name: "Gaveta 2") #destino
    box = @drawer.boxes.create!(name: "Movel", rows: 1, columns: 1) #alvo

    patch drawer_box_url(@drawer, box),
          params: { box: { drawer_id: other.id } }, #troca de gaveta
          as: :json

    assert_response :success #200
    box.reload #recarrega
    assert_equal other.id, box.drawer_id #gaveta nova
    assert_includes other.boxes.kept, box #aparece no destino
    assert_not_includes @drawer.boxes.kept, box #sai da origem
  end


  test "remove caixa" do #DELETE soft delete
    box = @drawer.boxes.create!(name: "Remover", rows: 1, columns: 1) #alvo

    assert_difference -> { Box.count }, -1 do #apaga do banco
      delete drawer_box_url(@drawer, box), as: :json #exclusao definitiva (MVP)
    end

    assert_response :no_content #204
    assert_nil Box.find_by(id: box.id) #nao existe mais
  end


  test "cria caixa 8x12 com 96 posicoes" do #tamanho padrao lab
    post drawer_boxes_url(@drawer),
         params: { box: { name: "Caixa Lab", rows: 8, columns: 12 } }, #8x12
         as: :json

    assert_response :created #201
    box = Box.last #caixa criada
    assert_equal 96, box.positions.count #8*12 = 96
  end

  test "rejeita caixa sem nome" do #validacao
    post drawer_boxes_url(@drawer),
         params: { box: { name: "", rows: 2, columns: 2 } }, #nome vazio
         as: :json

    assert_response :unprocessable_entity #422
  end
end
