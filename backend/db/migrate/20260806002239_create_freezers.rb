class CreateFreezers < ActiveRecord::Migration[8.1]
  def change
    create_table :freezers do |t|
      t.references :room, null: false, foreign_key: true
      t.string :name

      t.timestamps
    end
  end
end
