require "test_helper"

class SampleTest < ActiveSupport::TestCase #testes do model Sample
  fixtures []

  test "aceita concentracao vazia" do #allow_nil: true
    box = create_box(rows: 1, columns: 1)
    position = box.positions.first

    sample = Sample.new(
      position: position,
      codigo_amostra: "AMO-001",
      paciente_nome: "Maria",
      material: "Sangue",
      concentracao_ng_ul: nil
    )

    assert sample.valid?
    assert sample.save
  end

  test "rejeita codigo_amostra duplicado" do #uniqueness
    box = create_box(rows: 1, columns: 2)
    positions = box.positions.order(:row, :column).to_a

    Sample.create!(
      position: positions[0],
      codigo_amostra: "AMO-DUP",
      paciente_nome: "Maria",
      material: "Sangue"
    )

    duplicate = Sample.new(
      position: positions[1],
      codigo_amostra: "AMO-DUP", #mesmo codigo
      paciente_nome: "Joao",
      material: "Sangue"
    )

    assert_not duplicate.valid?
    assert_includes duplicate.errors[:codigo_amostra], "has already been taken"
  end

  test "rejeita concentracao negativa" do #>= 0
    box = create_box(rows: 1, columns: 1)

    sample = Sample.new(
      position: box.positions.first,
      codigo_amostra: "AMO-002",
      paciente_nome: "Maria",
      material: "Sangue",
      concentracao_ng_ul: -1
    )

    assert_not sample.valid?
    assert_includes sample.errors[:concentracao_ng_ul], "must be greater than or equal to 0"
  end

  test "exige paciente_nome e material" do
    box = create_box(rows: 1, columns: 1)

    sample = Sample.new(
      position: box.positions.first,
      codigo_amostra: "AMO-003",
      paciente_nome: "",
      material: ""
    )

    assert_not sample.valid?
    assert_includes sample.errors[:paciente_nome], "can't be blank"
    assert_includes sample.errors[:material], "can't be blank"
  end

  test "rejeita codigo_amostra vazio" do
    box = create_box(rows: 1, columns: 1)

    sample = Sample.new(
      position: box.positions.first,
      codigo_amostra: "",
      paciente_nome: "Maria",
      material: "DNA"
    )

    assert_not sample.valid?
    assert_includes sample.errors[:codigo_amostra], "can't be blank"
  end

  test "aceita concentracao zero" do #zero e valido (>= 0)
    box = create_box(rows: 1, columns: 1)

    sample = Sample.new(
      position: box.positions.first,
      codigo_amostra: "AMO-ZERO",
      paciente_nome: "Maria",
      material: "DNA",
      concentracao_ng_ul: 0
    )

    assert sample.valid?
  end

  test "exige position" do #belongs_to position
    sample = Sample.new(
      codigo_amostra: "AMO-004",
      paciente_nome: "Maria",
      material: "DNA"
    )

    assert_not sample.valid?
    assert_includes sample.errors[:position], "must exist"
  end

  test "campos opcionais exame e observacao podem ficar vazios" do
    box = create_box(rows: 1, columns: 1)

    sample = Sample.new(
      position: box.positions.first,
      codigo_amostra: "AMO-OPC",
      paciente_nome: "Maria",
      material: "DNA",
      exame: nil,
      observacao: nil
    )

    assert sample.valid?
  end
end
