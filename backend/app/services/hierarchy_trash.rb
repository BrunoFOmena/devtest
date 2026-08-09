# Soft-delete e restauracao da hierarquia fisica (sala → freezer → gaveta → caixa).
# FORA DO MVP: controllers usam destroy! definitivo; este service fica para implementação futura.
class HierarchyTrash #service da lixeira da estrutura fisica

  def self.discard!(record) #atalho para descartar um registro
    new.discard!(record)
  end

  def self.restore!(type, id) #atalho para restaurar pelo tipo e id
    new.restore!(type, id)
  end

  def self.list #atalho para listar a lixeira
    new.list
  end

  def discard!(record) #descarta o registro e os filhos ativos
    ActiveRecord::Base.transaction do #tudo ou nada
      case record #decide pelo tipo
      when Room
        discard_room!(record) #sala + freezers + gavetas + caixas
      when Freezer
        discard_freezer!(record) #freezer + gavetas + caixas
      when Drawer
        discard_drawer!(record) #gaveta + caixas
      when Box
        record.discard! #so a caixa
      else
        raise ArgumentError, "Tipo não suportado" #tipo invalido
      end
    end
  end

  def restore!(type, id) #restaura item da lixeira (e ancestrais se preciso)
    ActiveRecord::Base.transaction do #tudo ou nada
      case type.to_s
      when "room"
        room = Room.discarded.find(id) #acha a sala na lixeira
        room.undiscard! #restaura a sala
        room.freezers.discarded.find_each { |freezer| restore_freezer_tree!(freezer) } #restaura a arvore de freezers
        trash_item(room) #monta o json do item
      when "freezer"
        freezer = Freezer.discarded.find(id) #acha o freezer na lixeira
        freezer.room.undiscard! if freezer.room.discarded? #restaura a sala pai se estiver descartada
        restore_freezer_tree!(freezer) #restaura freezer + filhos
        trash_item(freezer)
      when "drawer"
        drawer = Drawer.discarded.find(id) #acha a gaveta na lixeira
        restore_ancestors_for_drawer!(drawer) #garante sala e freezer ativos
        restore_drawer_tree!(drawer) #restaura gaveta + caixas
        trash_item(drawer)
      when "box"
        box = Box.discarded.find(id) #acha a caixa na lixeira
        restore_ancestors_for_box!(box) #garante sala/freezer/gaveta ativos
        box.undiscard! #restaura a caixa
        trash_item(box)
      else
        raise ArgumentError, "Tipo inválido: #{type}" #tipo desconhecido
      end
    end
  end

  def list #lista tudo que esta na lixeira
    items = []
    Room.discarded.find_each { |room| items << trash_item(room) } #salas descartadas
    Freezer.discarded.find_each { |freezer| items << trash_item(freezer) } #freezers descartados
    Drawer.discarded.find_each { |drawer| items << trash_item(drawer) } #gavetas descartadas
    Box.discarded.find_each { |box| items << trash_item(box) } #caixas descartadas
    items.sort_by { |item| item[:discarded_at] }.reverse #mais recentes primeiro
  end

  private #metodos privados

  def discard_room!(room) #descarta sala e filhos
    room.freezers.kept.find_each { |freezer| discard_freezer!(freezer) } #primeiro os freezers ativos
    room.discard! #depois a sala
  end

  def discard_freezer!(freezer) #descarta freezer e filhos
    freezer.drawers.kept.find_each { |drawer| discard_drawer!(drawer) } #primeiro as gavetas
    freezer.discard! #depois o freezer
  end

  def discard_drawer!(drawer) #descarta gaveta e caixas
    drawer.boxes.kept.find_each(&:discard!) #descarta cada caixa ativa
    drawer.discard! #depois a gaveta
  end

  def restore_freezer_tree!(freezer) #restaura freezer + gavetas + caixas descartados
    freezer.undiscard!
    freezer.drawers.discarded.find_each { |drawer| restore_drawer_tree!(drawer) }
  end

  def restore_drawer_tree!(drawer) #restaura gaveta + caixas descartadas
    drawer.undiscard!
    drawer.boxes.discarded.find_each(&:undiscard!)
  end

  def restore_ancestors_for_drawer!(drawer) #restaura pais da gaveta se estiverem na lixeira
    freezer = drawer.freezer
    freezer.room.undiscard! if freezer.room.discarded?
    freezer.undiscard! if freezer.discarded?
  end

  def restore_ancestors_for_box!(box) #restaura pais da caixa se estiverem na lixeira
    drawer = box.drawer
    freezer = drawer.freezer
    freezer.room.undiscard! if freezer.room.discarded?
    freezer.undiscard! if freezer.discarded?
    drawer.undiscard! if drawer.discarded?
  end

  def trash_item(record) #monta o hash JSON de um item da lixeira
    case record
    when Room
      {
        type: "room", #tipo do item
        id: record.id,
        name: record.name,
        path: record.name, #caminho legivel
        discarded_at: record.discarded_at #quando foi descartado
      }
    when Freezer
      {
        type: "freezer",
        id: record.id,
        name: record.name,
        path: "#{record.room.name} / #{record.name}", #sala / freezer
        discarded_at: record.discarded_at
      }
    when Drawer
      {
        type: "drawer",
        id: record.id,
        name: record.name,
        path: "#{record.freezer.room.name} / #{record.freezer.name} / #{record.name}", #sala / freezer / gaveta
        discarded_at: record.discarded_at
      }
    when Box
      {
        type: "box",
        id: record.id,
        name: record.name,
        path: "#{record.drawer.freezer.room.name} / #{record.drawer.freezer.name} / #{record.drawer.name} / #{record.name}", #caminho completo
        discarded_at: record.discarded_at
      }
    end
  end
end
