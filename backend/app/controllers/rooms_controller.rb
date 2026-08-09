class RoomsController < ApplicationController #herda da classe ApplicationController
  before_action :set_room, only: %i[show update destroy] #antes de show, update ou destroy, set_room sera executado

  def index #metodo para listar as salas
    render json: Room.kept.order(:name) #renderiza o json com as salas ativas ordenadas pelo nome
  end

  def show #metodo para mostrar uma sala
    render json: @room #renderiza o json com a sala
  end

  def create #metodo para criar uma sala
    room = Room.new(room_params) #cria uma nova sala com os parametros passados

    if room.save #se a sala for salva
      render json: room, status: :created #renderiza o json com a sala e o status created
    else
      render_validation_errors(room) #renderiza o json com os erros de validacao
    end
  end

  def update #metodo para atualizar uma sala
    if @room.update(room_params) #se a sala for atualizada
      render json: @room #renderiza o json com a sala
    else
      render_validation_errors(@room) #renderiza o json com os erros de validacao
    end
  end

  def destroy #MVP: exclusao definitiva (cascata via dependent: :destroy nos models)
    # HierarchyTrash.discard!(@room) #FUTURO: soft-delete / lixeira
    @room.destroy! #apaga a sala e a hierarquia filha
    head :no_content #retorna 204 sem corpo
  end


  private #metodos privados para nao serem acessados externamente

  def set_room #metodo para setar a sala
    @room = Room.kept.find(params[:id]) #pega a sala ativa pelo id da url
  end

  def room_params #metodo para pegar os parametros da sala
    params.require(:room).permit(:name) #permite apenas o campo name
  end
end
