require "test_helper" #carrega setup global

class SampleAllocatorTest < ActiveSupport::TestCase #testes do SampleAllocator
  fixtures [] #nao usa fixtures YAML

  test "retorna A1 quando a caixa esta vazia" do #primeira celula livre
    box = create_box(rows: 4, columns: 4) #caixa 4x4 vazia

    position = SampleAllocator.call #pede sugestao

    assert_equal box.positions.find_by!(row: "A", column: 1), position #deve ser A1
  end

  test "percorre posicoes linha a linha dentro da caixa" do #A1 -> A2
    box = create_box(rows: 2, columns: 2) #grade pequena
    occupy(box, "A", 1) #ocupa A1

    position = SampleAllocator.call #proxima livre

    assert_equal box.positions.find_by!(row: "A", column: 2), position #cai em A2
  end

  test "enche a caixa mais antiga antes de ir para a proxima" do #first-fit por created_at
    older_box = create_box(rows: 1, columns: 1, created_at: 2.days.ago) #mais antiga
    newer_box = create_box(rows: 1, columns: 1, created_at: 1.day.ago) #mais nova

    occupy(older_box, "A", 1) #enche a antiga

    position = SampleAllocator.call #vai pra nova

    assert_equal newer_box.positions.find_by!(row: "A", column: 1), position #A1 da nova
  end

  test "vai para A1 da proxima caixa quando a atual enche" do #troca de caixa
    first_box = create_box(rows: 2, columns: 2, created_at: 2.days.ago, name: "Caixa 1") #antiga
    second_box = create_box(rows: 2, columns: 2, created_at: 1.day.ago, name: "Caixa 2") #nova

    occupy(first_box, "A", 1) #enche A1
    occupy(first_box, "A", 2) #enche A2
    occupy(first_box, "B", 1) #enche B1
    occupy(first_box, "B", 2) #enche B2 → cheia

    position = SampleAllocator.call #pula pra segunda

    assert_equal second_box.positions.find_by!(row: "A", column: 1), position #A1 da Caixa 2
  end

  test "respeita ordem de created_at entre tres caixas" do #A cheia, B cheia → C
    box_a = create_box(rows: 1, columns: 1, created_at: 3.days.ago, name: "A") #mais antiga
    box_b = create_box(rows: 1, columns: 1, created_at: 2.days.ago, name: "B") #meio
    _box_c = create_box(rows: 1, columns: 1, created_at: 1.day.ago, name: "C") #mais nova

    occupy(box_a, "A", 1) #enche A
    occupy(box_b, "A", 1) #enche B

    position = SampleAllocator.call #sobra C

    assert_equal _box_c.positions.find_by!(row: "A", column: 1), position #A1 da C
  end

  test "retorna nil quando todas as caixas estao cheias" do #sem vaga
    box = create_box(rows: 1, columns: 1) #unica celula
    occupy(box, "A", 1) #ocupa tudo

    assert_nil SampleAllocator.call #nil = cheio
  end

  test "expoe mensagem para caixa cheia" do #constante de erro
    assert_equal "abrir nova caixa", SampleAllocator::FULL_MESSAGE #texto fixo
  end

  test "retorna nil quando nao existe nenhuma caixa" do #sem hierarquia
    assert_nil SampleAllocator.call #nada pra alocar
  end

  test "preenche buraco no meio da grade" do #first-fit pega o buraco
    box = create_box(rows: 2, columns: 2) #grade 2x2
    occupy(box, "A", 2) #ocupa A2
    occupy(box, "B", 1) #ocupa B1

    position = SampleAllocator.call #deve achar A1 livre

    assert_equal box.positions.find_by!(row: "A", column: 1), position #buraco A1
  end

  test "pula celulas ocupadas e segue na mesma caixa" do #A1 A2 ocupadas → B1
    box = create_box(rows: 2, columns: 2) #grade 2x2
    occupy(box, "A", 1) #ocupa A1
    occupy(box, "A", 2) #ocupa A2

    position = SampleAllocator.call #proxima livre

    assert_equal box.positions.find_by!(row: "B", column: 1), position #cai em B1
  end

  test "ignora caixa cheia antiga e usa buraco em caixa mais nova" do #pula antiga cheia
    older = create_box(rows: 1, columns: 1, created_at: 2.days.ago, name: "Antiga") #1 celula
    newer = create_box(rows: 2, columns: 1, created_at: 1.day.ago, name: "Nova") #2 celulas
    occupy(older, "A", 1) #enche antiga
    occupy(newer, "A", 1) #ocupa A1 da nova

    position = SampleAllocator.call #buraco B1 na nova

    assert_equal newer.positions.find_by!(row: "B", column: 1), position #B1 da Nova
  end

  test "escopo por sala restringe o first-fit as caixas daquela sala" do #filtro room_id
    older_box = create_box(rows: 1, columns: 1, created_at: 2.days.ago, name: "Fora") #outra sala
    scoped_box = create_box(rows: 1, columns: 1, created_at: 1.day.ago, name: "Dentro") #alvo
    room = scoped_box.drawer.freezer.room #sala do alvo

    position = SampleAllocator.call(room_id: room.id) #escopo da sala

    assert_equal scoped_box.positions.find_by!(row: "A", column: 1), position #dentro do escopo
    assert_not_equal older_box.id, position.box_id #nao pega a de fora
  end

  test "escopo por freezer e gaveta seguem a mesma regra" do #freezer_id / drawer_id
    _other = create_box(rows: 1, columns: 1, created_at: 3.days.ago, name: "Outra") #fora
    box = create_box(rows: 1, columns: 1, name: "Alvo") #caixa alvo

    by_freezer = SampleAllocator.call(freezer_id: box.drawer.freezer_id) #filtra freezer
    by_drawer = SampleAllocator.call(drawer_id: box.drawer_id) #filtra gaveta

    assert_equal box.id, by_freezer.box_id #freezer certo
    assert_equal box.id, by_drawer.box_id #gaveta certa
  end

  test "escopo por caixa aloca primeira celula livre da propria caixa" do #box_id
    _other = create_box(rows: 1, columns: 1, created_at: 3.days.ago, name: "Outra") #ignorada
    box = create_box(rows: 2, columns: 2, name: "Escolhida") #caixa escolhida
    occupy(box, "A", 1) #ocupa A1

    position = SampleAllocator.call(box_id: box.id) #so nesta caixa

    assert_equal box.positions.find_by!(row: "A", column: 2), position #A2 da escolhida
  end

  test "escopo cheio retorna nil mesmo com vaga fora do escopo" do #escopo > global
    full_box = create_box(rows: 1, columns: 1, name: "Cheia") #escopo cheio
    _free_box = create_box(rows: 1, columns: 1, name: "Livre") #vaga fora
    occupy(full_box, "A", 1) #enche a do escopo

    assert_nil SampleAllocator.call(box_id: full_box.id) #nil apesar da livre
  end

  test "escopo vazio equivale ao first-fit global" do #{} = sem filtro
    box = create_box(rows: 1, columns: 1) #unica caixa

    assert_equal SampleAllocator.call, SampleAllocator.call({}) #mesmo resultado
    assert_equal box.positions.first, SampleAllocator.call({}) #primeira livre
  end
end
