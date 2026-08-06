module DomainTestHelper
  def create_drawer(name: "Gaveta")
    room = Room.create!(name: "Sala")
    freezer = room.freezers.create!(name: "Freezer")
    freezer.drawers.create!(name: name)
  end

  def create_box(rows:, columns:, created_at: Time.current, name: "Caixa")
    drawer = create_drawer
    box = drawer.boxes.create!(name: name, rows: rows, columns: columns)
    box.update_column(:created_at, created_at)
    box
  end

  def occupy(box, row, column, **attrs)
    position = box.positions.find_by!(row: row, column: column)
    Sample.create!(
      {
        position: position,
        codigo_amostra: "TEST-#{SecureRandom.hex(4)}",
        paciente_nome: "Paciente Teste",
        material: "Sangue"
      }.merge(attrs)
    )
  end
end
