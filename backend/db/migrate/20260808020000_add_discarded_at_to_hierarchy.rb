class AddDiscardedAtToHierarchy < ActiveRecord::Migration[8.1] #migration do soft delete (lixeira)
  def change #change e reversivel
    add_column :rooms, :discarded_at, :datetime #quando a sala foi para a lixeira
    add_column :freezers, :discarded_at, :datetime #quando o freezer foi para a lixeira
    add_column :drawers, :discarded_at, :datetime #quando a gaveta foi para a lixeira
    add_column :boxes, :discarded_at, :datetime #quando a caixa foi para a lixeira

    add_index :rooms, :discarded_at #indice para filtrar kept/discarded
    add_index :freezers, :discarded_at
    add_index :drawers, :discarded_at
    add_index :boxes, :discarded_at
  end
end
