class Drawer < ApplicationRecord #model da gaveta
  include SoftDeletable #liga soft delete (kept / discard! / undiscard!)

  belongs_to :freezer #cada gaveta pertence a um freezer
  has_many :boxes, dependent: :destroy #uma gaveta tem varias caixas; apagar gaveta apaga caixas

  validates :name, presence: true #nome obrigatorio
end
