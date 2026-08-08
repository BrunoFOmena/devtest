class Room < ApplicationRecord #model da sala
  include SoftDeletable #liga soft delete (kept / discard! / undiscard!)

  has_many :freezers, dependent: :destroy #uma sala tem varios freezers; apagar sala apaga freezers

  validates :name, presence: true #nome obrigatorio
end
