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
end
