class CreateBoxes < ActiveRecord::Migration[8.1] #migration que cria a tabela boxes
  def change #change e reversivel
    create_table :boxes do |t| #cria a tabela boxes
      t.references :drawer, null: false, foreign_key: true #FK para drawers (obrigatoria)
      t.string :name #nome da caixa
      t.integer :rows #numero de linhas da grade
      t.integer :columns #numero de colunas da grade

      t.timestamps #created_at e updated_at
    end
  end
end
