class CreateBoxes < ActiveRecord::Migration[8.1]
  def change
    create_table :boxes do |t|
      t.references :drawer, null: false, foreign_key: true
      t.string :name
      t.integer :rows
      t.integer :columns

      t.timestamps
    end
  end
end
