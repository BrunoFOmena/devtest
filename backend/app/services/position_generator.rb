class PositionGenerator
  def self.call(box)
    new(box).call
  end

  def initialize(box)
    @box = box
  end

  def call
    return @box.positions if @box.positions.exists?

    (0...@box.rows).each do |row_index|
      row = row_label(row_index)

      (1..@box.columns).each do |column|
        @box.positions.create!(row: row, column: column)
      end
    end

    @box.positions
  end

  private

  def row_label(index)
    ('A'.ord + index).chr
  end
end
