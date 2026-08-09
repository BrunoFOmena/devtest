class CreateRooms < ActiveRecord::Migration[8.1] #migration que cria a tabela rooms
  def change #change e reversivel (up/down automatico)
    create_table :rooms do |t| #cria a tabela rooms
      t.string :name #nome da sala

      t.timestamps #created_at e updated_at
    end
  end
end
