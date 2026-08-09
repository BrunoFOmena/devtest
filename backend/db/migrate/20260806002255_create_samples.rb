class CreateSamples < ActiveRecord::Migration[8.1] #migration que cria a tabela samples
  def change #change e reversivel
    create_table :samples do |t| #cria a tabela samples (amostras)
      t.references :position, null: false, foreign_key: true #FK para positions (obrigatoria)
      t.string :codigo_amostra #identificador unico da amostra
      t.string :paciente_nome #nome do paciente
      t.decimal :concentracao_ng_ul #concentracao (pode ser null)
      t.string :material #tipo de material
      t.string :exame #exame associado (opcional)
      t.text :observacao #texto livre (opcional)

      t.timestamps #created_at e updated_at
    end
  end
end
