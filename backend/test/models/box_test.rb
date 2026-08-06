require "test_helper"

class BoxTest < ActiveSupport::TestCase
  fixtures []

  test "after_create gera posicoes automaticamente" do
    box = create_box(rows: 2, columns: 3)

    assert_equal 6, box.positions.count
    assert box.positions.exists?(row: "A", column: 1)
    assert box.positions.exists?(row: "B", column: 3)
  end

  test "exige nome" do
    drawer = create_drawer
    box = drawer.boxes.new(name: "", rows: 2, columns: 2)

    assert_not box.valid?
    assert_includes box.errors[:name], "can't be blank"
  end

  test "rows deve ser inteiro maior que zero" do
    drawer = create_drawer
    box = drawer.boxes.new(name: "Caixa", rows: 0, columns: 2)

    assert_not box.valid?
    assert_includes box.errors[:rows], "must be greater than 0"
  end

  test "columns deve ser inteiro maior que zero" do
    drawer = create_drawer
    box = drawer.boxes.new(name: "Caixa", rows: 2, columns: -1)

    assert_not box.valid?
    assert_includes box.errors[:columns], "must be greater than 0"
  end

  test "fluxo completo de alocacao dentro da caixa" do
    box = create_box(rows: 1, columns: 2)

    first = SampleAllocator.call
    occupy(box, "A", 1, codigo_amostra: "AMO-001")

    second = SampleAllocator.call
    occupy(box, "A", 2, codigo_amostra: "AMO-002")

    assert_equal box.positions.find_by!(row: "A", column: 1), first
    assert_equal box.positions.find_by!(row: "A", column: 2), second
    assert_nil SampleAllocator.call
  end
end
