class SampleAllocator
  FULL_MESSAGE = "abrir nova caixa"

  def self.call
    new.call
  end

  def call
    Box.order(created_at: :asc).each do |box|
      position = first_free_position(box)
      return position if position
    end

    nil
  end

  private

  def first_free_position(box)
    box.positions.where.missing(:sample).order(:row, :column).first
  end
end
