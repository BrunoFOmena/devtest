class Freezer < ApplicationRecord #model do freezer
  include SoftDeletable #liga soft delete (kept / discard! / undiscard!)

  belongs_to :room #cada freezer pertence a uma sala
  has_many :drawers, dependent: :destroy #um freezer tem varias gavetas; apagar freezer apaga gavetas

  validates :name, presence: true #nome obrigatorio
end
