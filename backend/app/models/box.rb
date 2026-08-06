class Box < ApplicationRecord
  belongs_to :drawer
  has_many :positions

  validates :name, presence: true
  validates :rows, numericality: { only_integer: true, greater_than: 0 }
  validates :columns, numericality: { only_integer: true, greater_than: 0 }

  after_create :generate_positions

  private

  def generate_positions
    PositionGenerator.call(self)
  end
end
