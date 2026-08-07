require "test_helper"

# Fluxo completo pela API: hierarquia -> grade -> suggest -> create -> search -> delete.
class EndToEndFlowTest < ActionDispatch::IntegrationTest
  fixtures []

  test "fluxo ponta a ponta da bancada" do
    post rooms_url, params: { room: { name: "Sala Pre-PCR" } }, as: :json
    assert_response :created
    room_id = JSON.parse(response.body)["id"]

    post room_freezers_url(room_id), params: { freezer: { name: "Freezer A" } }, as: :json
    assert_response :created
    freezer_id = JSON.parse(response.body)["id"]

    post freezer_drawers_url(freezer_id), params: { drawer: { name: "Gaveta 1" } }, as: :json
    assert_response :created
    drawer_id = JSON.parse(response.body)["id"]

    post drawer_boxes_url(drawer_id),
         params: { box: { name: "Caixa 1", rows: 2, columns: 2 } },
         as: :json
    assert_response :created
    box_id = JSON.parse(response.body)["id"]

    get box_positions_url(box_id), as: :json
    assert_response :success
    positions = JSON.parse(response.body)
    assert_equal 4, positions.length
    assert positions.all? { |position| position["occupied"] == false }

    post suggest_samples_url, as: :json
    assert_response :success
    suggestion = JSON.parse(response.body)
    assert_equal "A1", suggestion["label"]
    assert_equal "Sala Pre-PCR", suggestion["room"]
    assert_equal "Freezer A", suggestion["freezer"]
    assert_equal "Gaveta 1", suggestion["drawer"]
    assert_equal "Caixa 1", suggestion["box"]
    assert_includes suggestion["path"], "Sala Pre-PCR / Freezer A / Gaveta 1 / Caixa 1 / A1"
    assert_equal 0, Sample.count, "suggest nao deve gravar amostra"

    post samples_url,
         params: {
           sample: {
             codigo_amostra: "E2E-001",
             paciente_nome: "Maria Silva",
             material: "DNA",
             concentracao_ng_ul: 12.5,
             exame: "FMR1",
             observacao: "primeira amostra"
           }
         },
         as: :json
    assert_response :created
    first = JSON.parse(response.body)
    assert_equal "E2E-001", first["codigo_amostra"]
    assert_equal "A1", first["label"]
    assert_equal "Maria Silva", first["paciente_nome"]
    assert_equal "12.5", first["concentracao_ng_ul"].to_s

    post samples_url,
         params: {
           sample: {
             codigo_amostra: "E2E-002",
             paciente_nome: "Joao Souza",
             material: "Sangue",
             concentracao_ng_ul: nil
           }
         },
         as: :json
    assert_response :created
    second = JSON.parse(response.body)
    assert_equal "A2", second["label"]
    assert_nil second["concentracao_ng_ul"]

    get box_positions_url(box_id), as: :json
    grid = JSON.parse(response.body)
    occupied = grid.select { |position| position["occupied"] }
    assert_equal 2, occupied.length
    assert_equal "E2E-001", grid.find { |p| p["label"] == "A1" }.dig("sample", "codigo_amostra")

    get search_samples_url(q: "maria"), as: :json
    assert_response :success
    search = JSON.parse(response.body)
    assert_equal 1, search.length
    assert_equal "E2E-001", search.first["codigo_amostra"]
    assert_includes search.first["path"], "Caixa 1 / A1"

    get samples_url, as: :json
    assert_response :success
    listed = JSON.parse(response.body)
    assert_equal 2, listed.length
    assert_equal [ "E2E-002", "E2E-001" ], listed.map { |sample| sample["codigo_amostra"] }

    post samples_url,
         params: {
           sample: {
             codigo_amostra: "E2E-003",
             paciente_nome: "Ana",
             material: "DNA"
           }
         },
         as: :json
    assert_response :created
    assert_equal "B1", JSON.parse(response.body)["label"]

    post samples_url,
         params: {
           sample: {
             codigo_amostra: "E2E-004",
             paciente_nome: "Pedro",
             material: "DNA"
           }
         },
         as: :json
    assert_response :created
    assert_equal "B2", JSON.parse(response.body)["label"]

    post suggest_samples_url, as: :json
    assert_response :unprocessable_entity
    assert_equal SampleAllocator::FULL_MESSAGE, JSON.parse(response.body)["error"]

    post samples_url,
         params: {
           sample: {
             codigo_amostra: "E2E-005",
             paciente_nome: "Extra",
             material: "DNA"
           }
         },
         as: :json
    assert_response :unprocessable_entity
    assert_equal SampleAllocator::FULL_MESSAGE, JSON.parse(response.body)["error"]

    delete room_url(room_id), as: :json
    assert_response :no_content
    assert_equal 0, Room.count
    assert_equal 0, Freezer.count
    assert_equal 0, Drawer.count
    assert_equal 0, Box.count
    assert_equal 0, Position.count
    assert_equal 0, Sample.count
  end

  test "fluxo com duas caixas respeita first-fit entre caixas" do
    post rooms_url, params: { room: { name: "Sala 1" } }, as: :json
    room_id = JSON.parse(response.body)["id"]

    post room_freezers_url(room_id), params: { freezer: { name: "Freezer A" } }, as: :json
    freezer_id = JSON.parse(response.body)["id"]

    post freezer_drawers_url(freezer_id), params: { drawer: { name: "Gaveta 1" } }, as: :json
    drawer_id = JSON.parse(response.body)["id"]

    post drawer_boxes_url(drawer_id),
         params: { box: { name: "Caixa Antiga", rows: 1, columns: 1 } },
         as: :json
    assert_response :created
    older_box_id = JSON.parse(response.body)["id"]
    Box.find(older_box_id).update_column(:created_at, 2.days.ago)

    post drawer_boxes_url(drawer_id),
         params: { box: { name: "Caixa Nova", rows: 1, columns: 1 } },
         as: :json
    assert_response :created
    newer_box_id = JSON.parse(response.body)["id"]
    Box.find(newer_box_id).update_column(:created_at, 1.day.ago)

    post samples_url,
         params: { sample: { codigo_amostra: "FF-001", paciente_nome: "A", material: "DNA" } },
         as: :json
    assert_response :created
    first = JSON.parse(response.body)
    assert_equal "Caixa Antiga", first["box"]
    assert_equal "A1", first["label"]

    post samples_url,
         params: { sample: { codigo_amostra: "FF-002", paciente_nome: "B", material: "DNA" } },
         as: :json
    assert_response :created
    second = JSON.parse(response.body)
    assert_equal "Caixa Nova", second["box"]
    assert_equal "A1", second["label"]
  end
end
