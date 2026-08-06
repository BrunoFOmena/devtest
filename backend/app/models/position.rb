class Position < ApplicationRecord
  belongs_to :box
  has_one :sample, dependent: :destroy

  validates :row, presence: true
  validates :column, presence: true
  validates :row, uniqueness: { scope: %i[box_id column] }
end
