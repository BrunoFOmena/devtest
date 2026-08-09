# Schema do Solid Cache. Rails gera sozinho.
ActiveRecord::Schema[7.2].define(version: 1) do
  create_table "solid_cache_entries", force: :cascade do |t| #entradas do cache persistente
    t.binary "key", limit: 1024, null: false #chave do cache
    t.binary "value", limit: 536870912, null: false #valor guardado
    t.datetime "created_at", null: false
    t.integer "key_hash", limit: 8, null: false #hash da chave
    t.integer "byte_size", limit: 4, null: false #tamanho em bytes
    t.index ["byte_size"], name: "index_solid_cache_entries_on_byte_size"
    t.index ["key_hash", "byte_size"], name: "index_solid_cache_entries_on_key_hash_and_byte_size"
    t.index ["key_hash"], name: "index_solid_cache_entries_on_key_hash", unique: true #chave unica
  end
end
