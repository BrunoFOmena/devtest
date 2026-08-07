require "test_helper"

class DrawersTest < ActionDispatch::IntegrationTest
  fixtures []

  setup do
    room = Room.create!(name: "Sala 1")
    @freezer = room.freezers.create!(name: "Freezer A")
  end

  test "lista gavetas do freezer" do
    get freezer_drawers_url(@freezer), as: :json

    assert_response :success
    assert_equal [], JSON.parse(response.body)
  end

  test "cria gaveta no freezer" do
    assert_difference -> { @freezer.drawers.count }, 1 do
      post freezer_drawers_url(@freezer), params: { drawer: { name: "Gaveta 1" } }, as: :json
    end

    assert_response :created
    assert_equal "Gaveta 1", JSON.parse(response.body)["name"]
  end

  test "rejeita gaveta sem nome" do
    post freezer_drawers_url(@freezer), params: { drawer: { name: "" } }, as: :json

    assert_response :unprocessable_entity
  end

  test "mostra gaveta do freezer" do
    drawer = @freezer.drawers.create!(name: "Gaveta 2")

    get freezer_drawer_url(@freezer, drawer), as: :json

    assert_response :success
    assert_equal drawer.id, JSON.parse(response.body)["id"]
  end

  test "atualiza gaveta" do
    drawer = @freezer.drawers.create!(name: "Antiga")

    patch freezer_drawer_url(@freezer, drawer), params: { drawer: { name: "Nova" } }, as: :json

    assert_response :success
    assert_equal "Nova", drawer.reload.name
  end

  test "remove gaveta" do
    drawer = @freezer.drawers.create!(name: "Remover")

    assert_difference -> { Drawer.count }, -1 do
      delete freezer_drawer_url(@freezer, drawer), as: :json
    end

    assert_response :no_content
  end
end
