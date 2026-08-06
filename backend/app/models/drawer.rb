class Drawer < ApplicationRecord
  belongs_to :freezer
  has_many :boxes, dependent: :destroy

  validates :name, presence: true
end
