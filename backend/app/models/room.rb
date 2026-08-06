class Room < ApplicationRecord
  has_many :freezers

  validates :name, presence: true
end
