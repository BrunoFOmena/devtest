class Box < ApplicationRecord
  belongs_to :drawer
  has_many :positions

  validates :name, presence: true
  validates :rows, numericality: { only_integer: true, greater_than: 0 }
  validates :columns, numericality: { only_integer: true, greater_than: 0 }
end
