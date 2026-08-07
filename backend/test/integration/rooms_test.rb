require "test_helper"

class RoomsTest < ActionDispatch::IntegrationTest
  fixtures []

  test "lista salas vazias" do
    get rooms_url, as: :json

    assert_response :success
    assert_equal [], JSON.parse(response.body)
  end

  test "cria sala" do
    assert_difference -> { Room.count }, 1 do
      post rooms_url, params: { room: { name: "Sala 1" } }, as: :json
    end

    assert_response :created
    assert_equal "Sala 1", JSON.parse(response.body)["name"]
  end

  test "rejeita sala sem nome" do
    post rooms_url, params: { room: { name: "" } }, as: :json

    assert_response :unprocessable_entity
    assert JSON.parse(response.body).key?("errors")
  end

  test "mostra sala existente" do
    room = Room.create!(name: "Sala 2")

    get room_url(room), as: :json

    assert_response :success
    assert_equal room.id, JSON.parse(response.body)["id"]
  end

  test "retorna 404 para sala inexistente" do
    get room_url(0), as: :json

    assert_response :not_found
    assert_equal "Not found", JSON.parse(response.body)["error"]
  end

  test "atualiza sala" do
    room = Room.create!(name: "Antiga")

    patch room_url(room), params: { room: { name: "Nova" } }, as: :json

    assert_response :success
    assert_equal "Nova", room.reload.name
  end

  test "remove sala" do
    room = Room.create!(name: "Remover")

    assert_difference -> { Room.count }, -1 do
      delete room_url(room), as: :json
    end

    assert_response :no_content
  end

  test "remove sala apaga hierarquia inteira pela API" do
    box = create_box(rows: 1, columns: 1)
    occupy(box, "A", 1, codigo_amostra: "ROOM-DEL-001")
    room = box.drawer.freezer.room

    delete room_url(room), as: :json

    assert_response :no_content
    assert_equal 0, Freezer.count
    assert_equal 0, Drawer.count
    assert_equal 0, Box.count
    assert_equal 0, Position.count
    assert_equal 0, Sample.count
  end

  test "rejeita create com body vazio" do
    post rooms_url, params: {}, as: :json

    assert_response :unprocessable_entity
    assert JSON.parse(response.body).key?("error")
  end
end
