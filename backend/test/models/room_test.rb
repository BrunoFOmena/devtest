require "test_helper"

class RoomTest < ActiveSupport::TestCase
  fixtures []

  test "exige nome" do
    room = Room.new(name: "")

    assert_not room.valid?
    assert_includes room.errors[:name], "can't be blank"
  end

  test "destroy em cascata remove freezers drawers boxes positions e samples" do
    box = create_box(rows: 1, columns: 1)
    occupy(box, "A", 1, codigo_amostra: "CASCATA-001")
    room = box.drawer.freezer.room

    assert_difference -> { Room.count }, -1 do
      assert_difference -> { Freezer.count }, -1 do
        assert_difference -> { Drawer.count }, -1 do
          assert_difference -> { Box.count }, -1 do
            assert_difference -> { Position.count }, -1 do
              assert_difference -> { Sample.count }, -1 do
                room.destroy!
              end
            end
          end
        end
      end
    end
  end
end
