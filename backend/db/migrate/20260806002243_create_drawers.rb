class CreateDrawers < ActiveRecord::Migration[8.1] #migration que cria a tabela drawers
  def change #change e reversivel
    create_table :drawers do |t| #cria a tabela drawers
      t.references :freezer, null: false, foreign_key: true #FK para freezers (obrigatoria)
      t.string :name #nome da gaveta

      t.timestamps #created_at e updated_at
    end
  end
end
