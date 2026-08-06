class CreateSamples < ActiveRecord::Migration[8.1]
  def change
    create_table :samples do |t|
      t.references :position, null: false, foreign_key: true
      t.string :codigo_amostra
      t.string :paciente_nome
      t.decimal :concentracao_ng_ul
      t.string :material
      t.string :exame
      t.text :observacao

      t.timestamps
    end
  end
end
