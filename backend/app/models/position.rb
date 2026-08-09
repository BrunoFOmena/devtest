class Position < ApplicationRecord #model da posicao (celula A1, B2...)
  belongs_to :box #cada posicao pertence a uma caixa
  has_one :sample, dependent: :destroy #uma posicao tem no maximo uma amostra; apagar posicao apaga amostra

  validates :row, presence: true #linha obrigatoria (letra)
  validates :column, presence: true #coluna obrigatoria (numero)
  validates :row, uniqueness: { scope: %i[box_id column] } #na mesma caixa nao pode ter dois A1
end
