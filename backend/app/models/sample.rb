class Sample < ApplicationRecord
  belongs_to :position

  validates :codigo_amostra, presence: true, uniqueness: true
  validates :paciente_nome, presence: true
  validates :material, presence: true
  validates :concentracao_ng_ul, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
end
