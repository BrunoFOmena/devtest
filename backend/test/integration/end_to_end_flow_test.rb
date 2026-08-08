require "test_helper" #carrega setup global

# Fluxo completo pela API: hierarquia -> grade -> suggest -> create -> search -> delete.
class EndToEndFlowTest < ActionDispatch::IntegrationTest #fluxo ponta a ponta
  fixtures [] #nao usa fixtures YAML

  test "fluxo ponta a ponta da bancada" do #happy path + caixa cheia
    post rooms_url, params: { room: { name: "Sala Pre-PCR" } }, as: :json #cria sala
    assert_response :created #201
    room_id = JSON.parse(response.body)["id"] #guarda id

    post room_freezers_url(room_id), params: { freezer: { name: "Freezer A" } }, as: :json #freezer
    assert_response :created #201
    freezer_id = JSON.parse(response.body)["id"] #guarda id

    post freezer_drawers_url(freezer_id), params: { drawer: { name: "Gaveta 1" } }, as: :json #gaveta
    assert_response :created #201
    drawer_id = JSON.parse(response.body)["id"] #guarda id

    post drawer_boxes_url(drawer_id),
         params: { box: { name: "Caixa 1", rows: 2, columns: 2 } }, #caixa 2x2
         as: :json
    assert_response :created #201
    box_id = JSON.parse(response.body)["id"] #guarda id

    get box_positions_url(box_id), as: :json #lista grade
    assert_response :success #200
    positions = JSON.parse(response.body) #parse
    assert_equal 4, positions.length #4 celulas
    assert positions.all? { |position| position["occupied"] == false } #todas livres

    post suggest_samples_url, as: :json #sugere sem gravar
    assert_response :success #200
    suggestion = JSON.parse(response.body) #parse
    assert_equal "A1", suggestion["label"] #primeira livre
    assert_equal "Sala Pre-PCR", suggestion["room"] #path sala
    assert_equal "Freezer A", suggestion["freezer"] #path freezer
    assert_equal "Gaveta 1", suggestion["drawer"] #path gaveta
    assert_equal "Caixa 1", suggestion["box"] #path caixa
    assert_includes suggestion["path"], "Sala Pre-PCR / Freezer A / Gaveta 1 / Caixa 1 / A1" #path completo
    assert_equal 0, Sample.count, "suggest nao deve gravar amostra" #so sugere

    post samples_url,
         params: {
           sample: {
             codigo_amostra: "E2E-001", #primeira amostra
             paciente_nome: "Maria Silva",
             material: "DNA",
             concentracao_ng_ul: 12.5,
             exame: "FMR1",
             observacao: "primeira amostra"
           }
         },
         as: :json
    assert_response :created #201
    first = JSON.parse(response.body) #parse
    assert_equal "E2E-001", first["codigo_amostra"] #codigo
    assert_equal "A1", first["label"] #caiu em A1
    assert_equal "Maria Silva", first["paciente_nome"] #paciente
    assert_equal "12.5", first["concentracao_ng_ul"].to_s #conc

    post samples_url,
         params: {
           sample: {
             codigo_amostra: "E2E-002", #segunda amostra
             paciente_nome: "Joao Souza",
             material: "Sangue",
             concentracao_ng_ul: nil #sem conc
           }
         },
         as: :json
    assert_response :created #201
    second = JSON.parse(response.body) #parse
    assert_equal "A2", second["label"] #proxima celula
    assert_nil second["concentracao_ng_ul"] #nil ok

    get box_positions_url(box_id), as: :json #grade atualizada
    grid = JSON.parse(response.body) #parse
    occupied = grid.select { |position| position["occupied"] } #ocupadas
    assert_equal 2, occupied.length #duas ocupadas
    assert_equal "E2E-001", grid.find { |p| p["label"] == "A1" }.dig("sample", "codigo_amostra") #A1=E2E-001

    get search_samples_url(q: "maria"), as: :json #busca paciente
    assert_response :success #200
    search = JSON.parse(response.body) #parse
    assert_equal 1, search.length #achou um
    assert_equal "E2E-001", search.first["codigo_amostra"] #codigo
    assert_includes search.first["path"], "Caixa 1 / A1" #path parcial

    get samples_url, as: :json #lista todas
    assert_response :success #200
    listed = JSON.parse(response.body) #parse
    assert_equal 2, listed.length #duas amostras
    assert_equal [ "E2E-002", "E2E-001" ], listed.map { |sample| sample["codigo_amostra"] } #ordem

    post samples_url,
         params: {
           sample: {
             codigo_amostra: "E2E-003", #terceira
             paciente_nome: "Ana",
             material: "DNA"
           }
         },
         as: :json
    assert_response :created #201
    assert_equal "B1", JSON.parse(response.body)["label"] #B1

    post samples_url,
         params: {
           sample: {
             codigo_amostra: "E2E-004", #quarta
             paciente_nome: "Pedro",
             material: "DNA"
           }
         },
         as: :json
    assert_response :created #201
    assert_equal "B2", JSON.parse(response.body)["label"] #B2 → cheia

    post suggest_samples_url, as: :json #sem vaga
    assert_response :unprocessable_entity #422
    assert_equal SampleAllocator::FULL_MESSAGE, JSON.parse(response.body)["error"] #msg cheia

    post samples_url,
         params: {
           sample: {
             codigo_amostra: "E2E-005", #extra sem vaga
             paciente_nome: "Extra",
             material: "DNA"
           }
         },
         as: :json
    assert_response :unprocessable_entity #422
    assert_equal SampleAllocator::FULL_MESSAGE, JSON.parse(response.body)["error"] #mesmo erro

    delete room_url(room_id), as: :json #lixeira em cascata
    assert_response :no_content #204
    assert_equal 0, Room.kept.count #sala fora
    assert_equal 0, Freezer.kept.count #freezer fora
    assert_equal 0, Drawer.kept.count #gaveta fora
    assert_equal 0, Box.kept.count #caixa fora
  end

  test "fluxo com duas caixas respeita first-fit entre caixas" do #antiga antes da nova
    post rooms_url, params: { room: { name: "Sala 1" } }, as: :json #sala
    room_id = JSON.parse(response.body)["id"] #id sala

    post room_freezers_url(room_id), params: { freezer: { name: "Freezer A" } }, as: :json #freezer
    freezer_id = JSON.parse(response.body)["id"] #id freezer

    post freezer_drawers_url(freezer_id), params: { drawer: { name: "Gaveta 1" } }, as: :json #gaveta
    drawer_id = JSON.parse(response.body)["id"] #id gaveta

    post drawer_boxes_url(drawer_id),
         params: { box: { name: "Caixa Antiga", rows: 1, columns: 1 } }, #1 celula
         as: :json
    assert_response :created #201
    older_box_id = JSON.parse(response.body)["id"] #id antiga
    Box.find(older_box_id).update_column(:created_at, 2.days.ago) #forca idade

    post drawer_boxes_url(drawer_id),
         params: { box: { name: "Caixa Nova", rows: 1, columns: 1 } }, #1 celula
         as: :json
    assert_response :created #201
    newer_box_id = JSON.parse(response.body)["id"] #id nova
    Box.find(newer_box_id).update_column(:created_at, 1.day.ago) #mais nova

    post samples_url,
         params: { sample: { codigo_amostra: "FF-001", paciente_nome: "A", material: "DNA" } },
         as: :json
    assert_response :created #201
    first = JSON.parse(response.body) #parse
    assert_equal "Caixa Antiga", first["box"] #enche a antiga primeiro
    assert_equal "A1", first["label"] #unica celula

    post samples_url,
         params: { sample: { codigo_amostra: "FF-002", paciente_nome: "B", material: "DNA" } },
         as: :json
    assert_response :created #201
    second = JSON.parse(response.body) #parse
    assert_equal "Caixa Nova", second["box"] #depois a nova
    assert_equal "A1", second["label"] #unica celula
  end
end
