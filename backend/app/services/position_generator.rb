class PositionGenerator #service que cria a grade de posicoes da caixa
  def self.call(box) #atalho: PositionGenerator.call(box)
    new(box).call #cria instancia e executa
  end

  def initialize(box) #recebe a caixa
    @box = box #guarda a caixa
  end

  def call #gera as celulas A1, A2... se ainda nao existirem
    return @box.positions if @box.positions.exists? #se ja tem posicoes, nao duplica

    (0...@box.rows).each do |row_index| #percorre cada linha (0 = A, 1 = B...)
      row = row_label(row_index) #converte indice em letra

      (1..@box.columns).each do |column| #percorre cada coluna (1, 2, 3...)
        @box.positions.create!(row: row, column: column) #cria a celula
      end
    end

    @box.positions #devolve as posicoes da caixa
  end

  private #metodos privados

  def row_label(index) #converte 0→A, 1→B, 2→C...
    ('A'.ord + index).chr #codigo ASCII de A + indice
  end
end
