class SamplesController < ApplicationController
  def index
    samples = Sample
      .includes(position: { box: { drawer: { freezer: :room } } })
      .order(created_at: :desc)

    render json: samples.map { |sample| sample_json(sample) }
  end

  def suggest
    position = SampleAllocator.call

    if position.nil?
      return render_error(SampleAllocator::FULL_MESSAGE)
    end

    render json: location_payload(position)
  end

  def create
    position = SampleAllocator.call

    if position.nil?
      return render_error(SampleAllocator::FULL_MESSAGE)
    end

    sample = Sample.new(sample_params.merge(position: position))

    if sample.save
      render json: sample_json(sample), status: :created
    else
      render_validation_errors(sample)
    end
  end

  def search
    query = params[:q].to_s.strip

    if query.blank?
      return render json: []
    end

    samples = Sample
      .where("codigo_amostra ILIKE :query OR paciente_nome ILIKE :query", query: "%#{query}%")
      .includes(position: { box: { drawer: { freezer: :room } } })
      .order(:codigo_amostra)
      .limit(50)

    render json: samples.map { |sample| sample_json(sample) }
  end

  private

  def sample_params
    params.require(:sample).permit(
      :codigo_amostra,
      :paciente_nome,
      :material,
      :concentracao_ng_ul,
      :exame,
      :observacao
    )
  end
end
