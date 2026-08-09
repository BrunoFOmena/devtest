require "test_helper" #carrega setup global

class RoomTest < ActiveSupport::TestCase #testes do model Room
  fixtures [] #nao usa fixtures YAML

  test "exige nome" do #validacao: nome obrigatorio
    room = Room.new(name: "") #sala sem nome

    assert_not room.valid? #deve ser invalida
    assert_includes room.errors[:name], "can't be blank" #erro no name
  end

  test "destroy em cascata remove freezers drawers boxes positions e samples" do #dependent: :destroy
    box = create_box(rows: 1, columns: 1) #monta hierarquia
    occupy(box, "A", 1, codigo_amostra: "CASCATA-001") #ocupa A1
    room = box.drawer.freezer.room #pega a sala raiz

    assert_difference -> { Room.count }, -1 do #espera -1 room
      assert_difference -> { Freezer.count }, -1 do
        assert_difference -> { Drawer.count }, -1 do
          assert_difference -> { Box.count }, -1 do
            assert_difference -> { Position.count }, -1 do
              assert_difference -> { Sample.count }, -1 do
                room.destroy! #apaga tudo em cascata
              end
            end
          end
        end
      end
    end
  end
end
