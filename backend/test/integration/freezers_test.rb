require "test_helper"

class FreezersTest < ActionDispatch::IntegrationTest
  fixtures []

  setup do
    @room = Room.create!(name: "Sala 1")
  end

  test "lista freezers da sala" do
    get room_freezers_url(@room), as: :json

    assert_response :success
    assert_equal [], JSON.parse(response.body)
  end

  test "cria freezer na sala" do
    assert_difference -> { @room.freezers.count }, 1 do
      post room_freezers_url(@room), params: { freezer: { name: "Freezer A" } }, as: :json
    end

    assert_response :created
    assert_equal "Freezer A", JSON.parse(response.body)["name"]
  end

  test "rejeita freezer sem nome" do
    post room_freezers_url(@room), params: { freezer: { name: "" } }, as: :json

    assert_response :unprocessable_entity
  end

  test "mostra freezer da sala" do
    freezer = @room.freezers.create!(name: "Freezer B")

    get room_freezer_url(@room, freezer), as: :json

    assert_response :success
    assert_equal freezer.id, JSON.parse(response.body)["id"]
  end

  test "atualiza freezer" do
    freezer = @room.freezers.create!(name: "Antigo")

    patch room_freezer_url(@room, freezer), params: { freezer: { name: "Novo" } }, as: :json

    assert_response :success
    assert_equal "Novo", freezer.reload.name
  end

  test "remove freezer" do
    freezer = @room.freezers.create!(name: "Remover")

    assert_difference -> { Freezer.count }, -1 do
      delete room_freezer_url(@room, freezer), as: :json
    end

    assert_response :no_content
  end
end
