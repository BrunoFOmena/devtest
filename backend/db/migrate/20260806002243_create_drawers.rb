class CreateDrawers < ActiveRecord::Migration[8.1]
  def change
    create_table :drawers do |t|
      t.references :freezer, null: false, foreign_key: true
      t.string :name

      t.timestamps
    end
  end
end
