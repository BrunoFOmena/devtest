require "test_helper"

class BoxTest < ActiveSupport::TestCase #testes do model Box
  fixtures []

  test "after_create gera posicoes automaticamente" do #callback + PositionGenerator
    box = create_box(rows: 2, columns: 3)

    assert_equal 6, box.positions.count #2x3 = 6
    assert box.positions.exists?(row: "A", column: 1) #primeira celula
    assert box.positions.exists?(row: "B", column: 3) #ultima celula
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

  test "fluxo completo de alocacao dentro da caixa" do #first-fit na mesma caixa
    box = create_box(rows: 1, columns: 2)

    first = SampleAllocator.call #deve ser A1
    occupy(box, "A", 1, codigo_amostra: "AMO-001") #ocupa A1

    second = SampleAllocator.call #deve ser A2
    occupy(box, "A", 2, codigo_amostra: "AMO-002") #ocupa A2

    assert_equal box.positions.find_by!(row: "A", column: 1), first
    assert_equal box.positions.find_by!(row: "A", column: 2), second
    assert_nil SampleAllocator.call #caixa cheia → nil
  end

  test "destroy remove posicoes e amostras da caixa" do #dependent: :destroy
    box = create_box(rows: 1, columns: 2)
    occupy(box, "A", 1, codigo_amostra: "BOX-DEL-001")

    assert_difference -> { Box.count }, -1 do
      assert_difference -> { Position.count }, -2 do
        assert_difference -> { Sample.count }, -1 do
          box.destroy!
        end
      end
    end
  end

  test "rejeita rows nao inteiro" do
    drawer = create_drawer
    box = drawer.boxes.new(name: "Caixa", rows: 1.5, columns: 2)

    assert_not box.valid?
    assert_includes box.errors[:rows], "must be an integer"
  end
end
