class Box < ApplicationRecord #model da caixa
  include SoftDeletable #liga soft delete (kept / discard! / undiscard!)

  belongs_to :drawer #cada caixa pertence a uma gaveta
  has_many :positions, dependent: :destroy #uma caixa tem varias posicoes; apagar caixa apaga posicoes

  validates :name, presence: true #nome obrigatorio
  validates :rows, numericality: { only_integer: true, greater_than: 0 } #linhas devem ser inteiro > 0
  validates :columns, numericality: { only_integer: true, greater_than: 0 } #colunas devem ser inteiro > 0

  after_create :generate_positions #depois de criar a caixa, gera a grade A1, A2...

  private #metodos privados para nao serem acessados externamente

  def generate_positions #callback que monta as celulas
    PositionGenerator.call(self) #chama o service passando esta caixa
  end
end
