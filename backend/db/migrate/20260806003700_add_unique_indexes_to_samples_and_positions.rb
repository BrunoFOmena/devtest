class AddUniqueIndexesToSamplesAndPositions < ActiveRecord::Migration[8.1] #migration dos indices unique
  def change #change e reversivel
    add_index :samples, :codigo_amostra, unique: true #codigo unico no sistema
    add_index :positions, %i[box_id row column], unique: true #na mesma caixa nao pode ter dois A1
  end
end
