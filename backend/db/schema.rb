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
# Foto atual do banco (apos cada migrate). Rails gera sozinho.

ActiveRecord::Schema[8.1].define(version: 2026_08_08_020000) do #versao = ultima migration aplicada
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql" #extensao padrao do Postgres

  create_table "boxes", force: :cascade do |t| #tabela de caixas
    t.integer "columns" #colunas da grade
    t.datetime "created_at", null: false
    t.datetime "discarded_at" #soft delete (lixeira)
    t.bigint "drawer_id", null: false #FK da gaveta
    t.string "name" #nome da caixa
    t.integer "rows" #linhas da grade
    t.datetime "updated_at", null: false
    t.index ["discarded_at"], name: "index_boxes_on_discarded_at"
    t.index ["drawer_id"], name: "index_boxes_on_drawer_id"
  end

  create_table "drawers", force: :cascade do |t| #tabela de gavetas
    t.datetime "created_at", null: false
    t.datetime "discarded_at" #soft delete
    t.bigint "freezer_id", null: false #FK do freezer
    t.string "name"
    t.datetime "updated_at", null: false
    t.index ["discarded_at"], name: "index_drawers_on_discarded_at"
    t.index ["freezer_id"], name: "index_drawers_on_freezer_id"
  end

  create_table "freezers", force: :cascade do |t| #tabela de freezers
    t.datetime "created_at", null: false
    t.datetime "discarded_at" #soft delete
    t.string "name"
    t.bigint "room_id", null: false #FK da sala
    t.datetime "updated_at", null: false
    t.index ["discarded_at"], name: "index_freezers_on_discarded_at"
    t.index ["room_id"], name: "index_freezers_on_room_id"
  end

  create_table "positions", force: :cascade do |t| #tabela de celulas (A1, B2...)
    t.bigint "box_id", null: false #FK da caixa
    t.integer "column" #numero da coluna
    t.datetime "created_at", null: false
    t.string "row" #letra da linha
    t.datetime "updated_at", null: false
    t.index ["box_id", "row", "column"], name: "index_positions_on_box_id_and_row_and_column", unique: true #unique por caixa
    t.index ["box_id"], name: "index_positions_on_box_id"
  end

  create_table "rooms", force: :cascade do |t| #tabela de salas
    t.datetime "created_at", null: false
    t.datetime "discarded_at" #soft delete
    t.string "name"
    t.datetime "updated_at", null: false
    t.index ["discarded_at"], name: "index_rooms_on_discarded_at"
  end

  create_table "samples", force: :cascade do |t| #tabela de amostras
    t.string "codigo_amostra" #codigo unico
    t.decimal "concentracao_ng_ul" #concentracao (opcional)
    t.datetime "created_at", null: false
    t.string "exame"
    t.string "material"
    t.text "observacao"
    t.string "paciente_nome"
    t.bigint "position_id", null: false #FK da posicao
    t.datetime "updated_at", null: false
    t.index ["codigo_amostra"], name: "index_samples_on_codigo_amostra", unique: true #codigo unico
    t.index ["position_id"], name: "index_samples_on_position_id"
  end

  add_foreign_key "boxes", "drawers" #caixa → gaveta
  add_foreign_key "drawers", "freezers" #gaveta → freezer
  add_foreign_key "freezers", "rooms" #freezer → sala
  add_foreign_key "positions", "boxes" #posicao → caixa
  add_foreign_key "samples", "positions" #amostra → posicao
end
