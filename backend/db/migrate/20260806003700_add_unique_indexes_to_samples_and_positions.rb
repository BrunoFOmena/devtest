class AddUniqueIndexesToSamplesAndPositions < ActiveRecord::Migration[8.1]
  def change
    add_index :samples, :codigo_amostra, unique: true
    add_index :positions, %i[box_id row column], unique: true
  end
end
