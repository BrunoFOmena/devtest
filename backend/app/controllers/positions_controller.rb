class PositionsController < ApplicationController
  before_action :set_box

  def index
    positions = @box.positions
      .includes(:sample)
      .order(:row, :column)

    render json: positions.map { |position| position_json(position) }
  end

  private

  def set_box
    @box = Box.find(params[:box_id])
  end

  def position_json(position)
    {
      id: position.id,
      row: position.row,
      column: position.column,
      label: "#{position.row}#{position.column}",
      occupied: position.sample.present?,
      sample: position.sample&.as_json(only: %i[id codigo_amostra paciente_nome concentracao_ng_ul material])
    }
  end
end
