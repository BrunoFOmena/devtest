module DomainTestHelper #helpers compartilhados pelos testes
  def create_drawer(name: "Gaveta") #cria sala → freezer → gaveta
    room = Room.create!(name: "Sala") #sala
    freezer = room.freezers.create!(name: "Freezer") #freezer
    freezer.drawers.create!(name: name) #gaveta
  end

  def create_box(rows:, columns:, created_at: Time.current, name: "Caixa") #cria caixa com grade
    drawer = create_drawer #monta a hierarquia ate a gaveta
    box = drawer.boxes.create!(name: name, rows: rows, columns: columns) #cria caixa (gera posicoes)
    box.update_column(:created_at, created_at) #ajusta created_at (importante pro first-fit)
    box
  end

  def occupy(box, row, column, **attrs) #ocupa uma celula com amostra
    position = box.positions.find_by!(row: row, column: column) #acha a posicao
    Sample.create!( #grava amostra
      {
        position: position,
        codigo_amostra: "TEST-#{SecureRandom.hex(4)}", #codigo unico aleatorio
        paciente_nome: "Paciente Teste",
        material: "Sangue"
      }.merge(attrs) #permite sobrescrever campos no teste
    )
  end
end
