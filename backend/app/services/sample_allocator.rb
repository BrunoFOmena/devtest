class SampleAllocator #service do first-fit: acha a primeira posicao livre
  FULL_MESSAGE = "abrir nova caixa" #mensagem quando nao ha vaga

  def self.call(scope = {}) #atalho: SampleAllocator.call(scope)
    new(scope).call #cria instancia e executa
  end

  def initialize(scope = {}) #recebe escopo opcional (room_id, freezer_id...)
    @scope = scope #guarda o filtro
  end

  def call #percorre caixas e devolve a primeira posicao livre
    boxes_in_scope.order(created_at: :asc).each do |box| #caixas mais antigas primeiro
      position = first_free_position(box) #primeira celula vazia na caixa
      return position if position #achou vaga: devolve e para
    end

    nil #nenhuma vaga: API traduz para "abrir nova caixa"
  end

  private #metodos privados

  def boxes_in_scope #monta a query das caixas ativas, com filtro opcional
    scope = Box.kept #so caixas nao descartadas
      .joins(drawer: { freezer: :room }) #liga gaveta → freezer → sala
      .merge(Drawer.kept) #so gavetas ativas
      .merge(Freezer.kept) #so freezers ativos
      .merge(Room.kept) #so salas ativas

    if @scope[:box_id].present? #filtro mais especifico: uma caixa
      scope.where(id: @scope[:box_id])
    elsif @scope[:drawer_id].present? #filtra por gaveta
      scope.where(drawer_id: @scope[:drawer_id])
    elsif @scope[:freezer_id].present? #filtra por freezer
      scope.where(drawers: { freezer_id: @scope[:freezer_id] })
    elsif @scope[:room_id].present? #filtra por sala
      scope.where(freezers: { room_id: @scope[:room_id] })
    else
      scope #sem filtro: first-fit global
    end
  end

  def first_free_position(box) #primeira posicao sem amostra, ordem A1, A2...
    box.positions.where.missing(:sample).order(:row, :column).first
  end
end
