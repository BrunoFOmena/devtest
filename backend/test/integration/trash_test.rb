require "test_helper" #carrega setup global

class TrashTest < ActionDispatch::IntegrationTest #API da lixeira
  fixtures [] #nao usa fixtures YAML

  test "lista e restaura item da lixeira" do #discard + restore
    room = Room.create!(name: "Sala Lixeira") #sala pai
    freezer = room.freezers.create!(name: "Freezer Lixeira") #alvo

    delete room_freezer_url(room, freezer), as: :json #manda pra lixeira
    assert_response :no_content #204

    get trash_url, as: :json #lista lixeira
    assert_response :success #200
    body = JSON.parse(response.body) #parse
    assert(body.any? { |item| item["type"] == "freezer" && item["id"] == freezer.id }) #aparece

    post "/trash/freezer/#{freezer.id}/restore", as: :json #restaura
    assert_response :success #200
    assert_not freezer.reload.discarded? #saiu da lixeira
    assert_includes Freezer.kept.pluck(:id), freezer.id #volta no kept
  end
end
