require "test_helper"

class SampleAllocatorTest < ActiveSupport::TestCase
  fixtures []

  test "retorna A1 quando a caixa esta vazia" do
    box = create_box(rows: 4, columns: 4)

    position = SampleAllocator.call

    assert_equal box.positions.find_by!(row: "A", column: 1), position
  end

  test "percorre posicoes linha a linha dentro da caixa" do
    box = create_box(rows: 2, columns: 2)
    occupy(box, "A", 1)

    position = SampleAllocator.call

    assert_equal box.positions.find_by!(row: "A", column: 2), position
  end

  test "enche a caixa mais antiga antes de ir para a proxima" do
    older_box = create_box(rows: 1, columns: 1, created_at: 2.days.ago)
    newer_box = create_box(rows: 1, columns: 1, created_at: 1.day.ago)

    occupy(older_box, "A", 1)

    position = SampleAllocator.call

    assert_equal newer_box.positions.find_by!(row: "A", column: 1), position
  end

  test "vai para A1 da proxima caixa quando a atual enche" do
    first_box = create_box(rows: 2, columns: 2, created_at: 2.days.ago, name: "Caixa 1")
    second_box = create_box(rows: 2, columns: 2, created_at: 1.day.ago, name: "Caixa 2")

    occupy(first_box, "A", 1)
    occupy(first_box, "A", 2)
    occupy(first_box, "B", 1)
    occupy(first_box, "B", 2)

    position = SampleAllocator.call

    assert_equal second_box.positions.find_by!(row: "A", column: 1), position
  end

  test "respeita ordem de created_at entre tres caixas" do
    box_a = create_box(rows: 1, columns: 1, created_at: 3.days.ago, name: "A")
    box_b = create_box(rows: 1, columns: 1, created_at: 2.days.ago, name: "B")
    _box_c = create_box(rows: 1, columns: 1, created_at: 1.day.ago, name: "C")

    occupy(box_a, "A", 1)
    occupy(box_b, "A", 1)

    position = SampleAllocator.call

    assert_equal _box_c.positions.find_by!(row: "A", column: 1), position
  end

  test "retorna nil quando todas as caixas estao cheias" do
    box = create_box(rows: 1, columns: 1)
    occupy(box, "A", 1)

    assert_nil SampleAllocator.call
  end

  test "expoe mensagem para caixa cheia" do
    assert_equal "abrir nova caixa", SampleAllocator::FULL_MESSAGE
  end
end
