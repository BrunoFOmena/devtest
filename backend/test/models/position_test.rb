require "test_helper"

class PositionTest < ActiveSupport::TestCase
  fixtures []

  test "nao permite duas posicoes iguais na mesma caixa" do
    box = create_box(rows: 1, columns: 1)

    duplicate = Position.new(box: box, row: "A", column: 1)

    assert_not duplicate.valid?
    assert_includes duplicate.errors[:row], "has already been taken"
  end

  test "posicao ocupada fica indisponivel para nova amostra na mesma celula" do
    box = create_box(rows: 1, columns: 1)
    position = box.positions.first

    occupy(box, "A", 1, codigo_amostra: "AMO-001")

    assert position.reload.sample.present?
    assert_equal 1, Sample.where(position_id: position.id).count
  end

  test "permite mesma celula em caixas diferentes" do
    box_a = create_box(rows: 1, columns: 1, name: "Caixa A")
    box_b = create_box(rows: 1, columns: 1, name: "Caixa B")

    assert box_a.positions.exists?(row: "A", column: 1)
    assert box_b.positions.exists?(row: "A", column: 1)
  end

  test "exige row e column" do
    box = create_box(rows: 1, columns: 1)
    position = Position.new(box: box, row: "", column: nil)

    assert_not position.valid?
    assert_includes position.errors[:row], "can't be blank"
    assert_includes position.errors[:column], "can't be blank"
  end

  test "destroy da posicao remove a amostra" do
    box = create_box(rows: 1, columns: 1)
    position = box.positions.first
    occupy(box, "A", 1, codigo_amostra: "POS-DEL-001")

    assert_difference -> { Sample.count }, -1 do
      position.destroy!
    end
  end
end
