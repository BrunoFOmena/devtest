class CreateFreezers < ActiveRecord::Migration[8.1] #migration que cria a tabela freezers
  def change #change e reversivel
    create_table :freezers do |t| #cria a tabela freezers
      t.references :room, null: false, foreign_key: true #FK para rooms (obrigatoria)
      t.string :name #nome do freezer

      t.timestamps #created_at e updated_at
    end
  end
end
