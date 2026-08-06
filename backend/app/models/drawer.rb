class Drawer < ApplicationRecord
  belongs_to :freezer
  has_many :boxes

  validates :name, presence: true
end
