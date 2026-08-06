class Room < ApplicationRecord
  has_many :freezers, dependent: :destroy

  validates :name, presence: true
end
