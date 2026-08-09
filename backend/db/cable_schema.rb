# Schema do Solid Cable (Action Cable). Rails gera sozinho.
ActiveRecord::Schema[7.1].define(version: 1) do
  create_table "solid_cable_messages", force: :cascade do |t| #mensagens do Action Cable
    t.binary "channel", limit: 1024, null: false #canal da mensagem
    t.binary "payload", limit: 536870912, null: false #conteudo
    t.datetime "created_at", null: false
    t.integer "channel_hash", limit: 8, null: false #hash do canal (busca)
    t.index ["channel"], name: "index_solid_cable_messages_on_channel"
    t.index ["channel_hash"], name: "index_solid_cable_messages_on_channel_hash"
    t.index ["created_at"], name: "index_solid_cable_messages_on_created_at"
  end
end
