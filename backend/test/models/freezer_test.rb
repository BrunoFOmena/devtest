require "test_helper"

class FreezerTest < ActiveSupport::TestCase
  fixtures []

  test "exige nome" do
    room = Room.create!(name: "Sala")
    freezer = room.freezers.new(name: "")

    assert_not freezer.valid?
    assert_includes freezer.errors[:name], "can't be blank"
  end

  test "pertence a uma sala" do
    freezer = Freezer.new(name: "Freezer A")

    assert_not freezer.valid?
    assert_includes freezer.errors[:room], "must exist"
  end

  test "destroy em cascata remove drawers boxes e positions" do
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
