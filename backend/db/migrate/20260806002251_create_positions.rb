class CreatePositions < ActiveRecord::Migration[8.1] #migration que cria a tabela positions
  def change #change e reversivel
    create_table :positions do |t| #cria a tabela positions (celulas A1, B2...)
      t.references :box, null: false, foreign_key: true #FK para boxes (obrigatoria)
      t.string :row #letra da linha (A, B, C...)
      t.integer :column #numero da coluna (1, 2, 3...)

      t.timestamps #created_at e updated_at
    end
  end
end
