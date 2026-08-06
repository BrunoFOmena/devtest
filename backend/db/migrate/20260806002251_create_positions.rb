class CreatePositions < ActiveRecord::Migration[8.1]
  def change
    create_table :positions do |t|
      t.references :box, null: false, foreign_key: true
      t.string :row
      t.integer :column

      t.timestamps
    end
  end
end
