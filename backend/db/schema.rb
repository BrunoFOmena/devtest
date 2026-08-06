# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_08_06_003700) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "boxes", force: :cascade do |t|
    t.integer "columns"
    t.datetime "created_at", null: false
    t.bigint "drawer_id", null: false
    t.string "name"
    t.integer "rows"
    t.datetime "updated_at", null: false
    t.index ["drawer_id"], name: "index_boxes_on_drawer_id"
  end

  create_table "drawers", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "freezer_id", null: false
    t.string "name"
    t.datetime "updated_at", null: false
    t.index ["freezer_id"], name: "index_drawers_on_freezer_id"
  end

  create_table "freezers", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name"
    t.bigint "room_id", null: false
    t.datetime "updated_at", null: false
    t.index ["room_id"], name: "index_freezers_on_room_id"
  end

  create_table "positions", force: :cascade do |t|
    t.bigint "box_id", null: false
    t.integer "column"
    t.datetime "created_at", null: false
    t.string "row"
    t.datetime "updated_at", null: false
    t.index ["box_id", "row", "column"], name: "index_positions_on_box_id_and_row_and_column", unique: true
    t.index ["box_id"], name: "index_positions_on_box_id"
  end

  create_table "rooms", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name"
    t.datetime "updated_at", null: false
  end

  create_table "samples", force: :cascade do |t|
    t.string "codigo_amostra"
    t.decimal "concentracao_ng_ul"
    t.datetime "created_at", null: false
    t.string "exame"
    t.string "material"
    t.text "observacao"
    t.string "paciente_nome"
    t.bigint "position_id", null: false
    t.datetime "updated_at", null: false
    t.index ["codigo_amostra"], name: "index_samples_on_codigo_amostra", unique: true
    t.index ["position_id"], name: "index_samples_on_position_id"
  end

  add_foreign_key "boxes", "drawers"
  add_foreign_key "drawers", "freezers"
  add_foreign_key "freezers", "rooms"
  add_foreign_key "positions", "boxes"
  add_foreign_key "samples", "positions"
end
