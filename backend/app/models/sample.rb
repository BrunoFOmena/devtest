class Sample < ApplicationRecord #model da amostra / microtubo
  belongs_to :position #cada amostra ocupa uma posicao

  validates :codigo_amostra, presence: true, uniqueness: true #codigo obrigatorio e unico no sistema
  validates :paciente_nome, presence: true #nome do paciente obrigatorio
  validates :material, presence: true #material obrigatorio
  validates :concentracao_ng_ul, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true #se vier preenchida, >= 0; nil permitido
end
