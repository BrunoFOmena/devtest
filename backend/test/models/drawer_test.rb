require "test_helper"

class DrawerTest < ActiveSupport::TestCase
  fixtures []

  test "exige nome" do
    room = Room.create!(name: "Sala")
    freezer = room.freezers.create!(name: "Freezer")
    drawer = freezer.drawers.new(name: "")

    assert_not drawer.valid?
    assert_includes drawer.errors[:name], "can't be blank"
  end

  test "pertence a um freezer" do
    drawer = Drawer.new(name: "Gaveta 1")

    assert_not drawer.valid?
    assert_includes drawer.errors[:freezer], "must exist"
  end

  test "destroy em cascata remove boxes e positions" do
    box = create_box(rows: 2, columns: 2)
    drawer = box.drawer

    assert_difference -> { Drawer.count }, -1 do
      assert_difference -> { Box.count }, -1 do
        assert_difference -> { Position.count }, -4 do
          drawer.destroy!
        end
      end
    end
  end
end
