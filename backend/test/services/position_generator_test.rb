require "test_helper"

class PositionGeneratorTest < ActiveSupport::TestCase
  fixtures []

  test "caixa 4x4 gera 16 posicoes com labels corretos" do
    box = create_box(rows: 4, columns: 4)

    assert_equal 16, box.positions.count

    assert box.positions.exists?(row: "A", column: 1)
    assert box.positions.exists?(row: "A", column: 4)
    assert box.positions.exists?(row: "D", column: 4)
  end

  test "caixa 10x10 gera 100 posicoes" do
    box = create_box(rows: 10, columns: 10)

    assert_equal 100, box.positions.count
    assert box.positions.exists?(row: "J", column: 10)
  end

  test "caixa 1x1 gera apenas A1" do
    box = create_box(rows: 1, columns: 1)

    assert_equal 1, box.positions.count
    assert_equal [ [ "A", 1 ] ], box.positions.pluck(:row, :column)
  end

  test "gera posicoes em ordem linha a linha" do
    box = create_box(rows: 2, columns: 3)

    labels = box.positions.order(:row, :column).pluck(:row, :column)

    assert_equal [ [ "A", 1 ], [ "A", 2 ], [ "A", 3 ], [ "B", 1 ], [ "B", 2 ], [ "B", 3 ] ], labels
  end

  test "nao duplica posicoes se ja existirem" do
    box = create_box(rows: 2, columns: 2)

    assert_no_difference -> { box.positions.count } do
      PositionGenerator.call(box)
    end
  end
end
