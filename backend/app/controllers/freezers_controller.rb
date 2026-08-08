class FreezersController < ApplicationController #herda da classe ApplicationController
  before_action :set_room #antes de qualquer action, set_room sera executado
  before_action :set_freezer, only: %i[show update destroy] #antes de show, update ou destroy, set_freezer sera executado

  def index #metodo para listar os freezers da sala
    render json: @room.freezers.kept.order(:name) #renderiza o json com os freezers ativos ordenados pelo nome
  end

  def show #metodo para mostrar um freezer
    render json: @freezer #renderiza o json com o freezer
  end

  def create #metodo para criar um freezer
    freezer = @room.freezers.new(freezer_params.except(:room_id)) #cria um freezer ligado a sala; room_id ja vem da url

    if freezer.save #se o freezer for salvo
      render json: freezer, status: :created #renderiza o json com o freezer e o status created
    else
      render_validation_errors(freezer) #renderiza o json com os erros de validacao
    end
  end

  def update #metodo para atualizar um freezer
    attrs = freezer_params #pega os parametros do freezer
    Room.kept.find(attrs[:room_id]) if attrs[:room_id].present? #se mandou room_id, confere se a sala existe e esta ativa

    if @freezer.update(attrs) #se o freezer for atualizado
      render json: @freezer #renderiza o json com o freezer
    else
      render_validation_errors(@freezer) #renderiza o json com os erros de validacao
    end
  end

  def destroy #metodo para deletar um freezer (manda para a lixeira)
    HierarchyTrash.discard!(@freezer) #descarta o freezer (soft delete)
    head :no_content #retorna o status no content
  end

  private #metodos privados para nao serem acessados externamente

  def set_room #metodo para setar a sala pai
    @room = Room.kept.find(params[:room_id]) #pega a sala ativa pelo room_id da url
  end

  def set_freezer #metodo para setar o freezer
    @freezer = @room.freezers.kept.find(params[:id]) #pega o freezer ativo dentro daquela sala
  end

  def freezer_params #metodo para pegar os parametros do freezer
    params.require(:freezer).permit(:name, :room_id) #permite name e room_id (para mover de sala)
  end
end
