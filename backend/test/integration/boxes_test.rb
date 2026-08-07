require "test_helper"

class BoxesTest < ActionDispatch::IntegrationTest
  fixtures []

  setup do
    room = Room.create!(name: "Sala 1")
    freezer = room.freezers.create!(name: "Freezer A")
    @drawer = freezer.drawers.create!(name: "Gaveta 1")
  end

  test "lista caixas da gaveta" do
    get drawer_boxes_url(@drawer), as: :json

    assert_response :success
    assert_equal [], JSON.parse(response.body)
  end

  test "cria caixa e gera posicoes" do
    assert_difference -> { @drawer.boxes.count }, 1 do
      post drawer_boxes_url(@drawer),
           params: { box: { name: "Caixa 1", rows: 2, columns: 3 } },
           as: :json
    end

    assert_response :created

    box = Box.last
    assert_equal 6, box.positions.count
  end

  test "rejeita caixa com rows invalido" do
    post drawer_boxes_url(@drawer),
         params: { box: { name: "Caixa", rows: 0, columns: 2 } },
         as: :json

    assert_response :unprocessable_entity
  end

  test "mostra caixa da gaveta" do
    box = @drawer.boxes.create!(name: "Caixa 2", rows: 1, columns: 1)

    get drawer_box_url(@drawer, box), as: :json

    assert_response :success
    assert_equal box.id, JSON.parse(response.body)["id"]
  end

  test "atualiza caixa" do
    box = @drawer.boxes.create!(name: "Antiga", rows: 1, columns: 1)

    patch drawer_box_url(@drawer, box), params: { box: { name: "Nova" } }, as: :json

    assert_response :success
    assert_equal "Nova", box.reload.name
  end

  test "remove caixa" do
    box = @drawer.boxes.create!(name: "Remover", rows: 1, columns: 1)

    assert_difference -> { Box.count }, -1 do
      delete drawer_box_url(@drawer, box), as: :json
    end

    assert_response :no_content
  end
end
