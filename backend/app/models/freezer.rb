class Freezer < ApplicationRecord
  belongs_to :room
  has_many :drawers, dependent: :destroy

  validates :name, presence: true
end
