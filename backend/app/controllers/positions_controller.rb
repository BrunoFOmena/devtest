class PositionsController < ApplicationController #herda da classe ApplicationController
  before_action :set_box #antes de qualquer action, set_box sera executado

  def index #metodo para listar a grade (posicoes) da caixa
    positions = @box.positions #pega as posicoes da caixa
      .includes(:sample) #ja carrega a amostra junto (evita N+1)
      .order(:row, :column) #ordena linha a linha (A1, A2, B1...)

    render json: positions.map { |position| position_json(position) } #monta o json de cada celula
  end

  private #metodos privados para nao serem acessados externamente

  def set_box #metodo para setar a caixa
    @box = Box.find(params[:box_id]) #pega a caixa pelo box_id da url
  end

  def position_json(position) #monta o json de uma celula da grade
    {
      id: position.id, #id da posicao
      row: position.row, #letra da linha (A, B, C...)
      column: position.column, #numero da coluna (1, 2, 3...)
      label: "#{position.row}#{position.column}", #celula legivel (A1, B2...)
      occupied: position.sample.present?, #true se tem amostra nessa celula
      sample: position.sample&.as_json( #resumo da amostra se existir; nil se vazia
        only: %i[id codigo_amostra paciente_nome concentracao_ng_ul material exame observacao] #so esses campos
      )
    }
  end
end
