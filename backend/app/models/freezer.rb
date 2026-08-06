class Freezer < ApplicationRecord
  belongs_to :room
  has_many :drawers

  validates :name, presence: true
end
