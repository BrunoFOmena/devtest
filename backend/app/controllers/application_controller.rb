class ApplicationController < ActionController::API
  rescue_from ActiveRecord::RecordNotFound do
    render json: { error: "Not found" }, status: :not_found
  end

  rescue_from ActionController::ParameterMissing do |exception|
    render json: { error: exception.message }, status: :unprocessable_entity
  end

  private

  def render_error(message, status: :unprocessable_entity)
    render json: { error: message }, status: status
  end

  def render_validation_errors(record)
    render json: { errors: record.errors }, status: :unprocessable_entity
  end

  def location_payload(position)
    box = position.box
    drawer = box.drawer
    freezer = drawer.freezer
    room = freezer.room
    label = "#{position.row}#{position.column}"

    {
      position_id: position.id,
      label: label,
      row: position.row,
      column: position.column,
      room: room.name,
      freezer: freezer.name,
      drawer: drawer.name,
      box: box.name,
      path: "#{room.name} / #{freezer.name} / #{drawer.name} / #{box.name} / #{label}"
    }
  end

  def sample_json(sample)
    location_payload(sample.position).merge(
      id: sample.id,
      codigo_amostra: sample.codigo_amostra,
      paciente_nome: sample.paciente_nome,
      material: sample.material,
      concentracao_ng_ul: sample.concentracao_ng_ul,
      exame: sample.exame,
      observacao: sample.observacao,
      created_at: sample.created_at,
      updated_at: sample.updated_at
    )
  end
end
