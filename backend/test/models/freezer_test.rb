require "test_helper"

class FreezerTest < ActiveSupport::TestCase #testes do model Freezer
  fixtures []

  test "exige nome" do #validacao: nome obrigatorio
    room = Room.create!(name: "Sala")
    freezer = room.freezers.new(name: "")

    assert_not freezer.valid?
    assert_includes freezer.errors[:name], "can't be blank"
  end

  test "pertence a uma sala" do #belongs_to room obrigatorio
    freezer = Freezer.new(name: "Freezer A") #sem room

    assert_not freezer.valid?
    assert_includes freezer.errors[:room], "must exist"
  end

  test "destroy em cascata remove drawers boxes e positions" do #dependent: :destroy
    box = create_box(rows: 1, columns: 1)
    freezer = box.drawer.freezer

    assert_difference -> { Freezer.count }, -1 do
      assert_difference -> { Drawer.count }, -1 do
        assert_difference -> { Box.count }, -1 do
          assert_difference -> { Position.count }, -1 do
            freezer.destroy!
          end
        end
      end
    end
  end
end
