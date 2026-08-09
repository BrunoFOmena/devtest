class DrawersController < ApplicationController #herda da classe ApplicationController
  before_action :set_freezer #antes de qualquer action, set_freezer sera executado
  before_action :set_drawer, only: %i[show update destroy] #antes de show, update ou destroy, set_drawer sera executado

  def index #metodo para listar as gavetas do freezer
    render json: @freezer.drawers.kept.order(:name) #renderiza o json com as gavetas ativas ordenadas pelo nome
  end

  def show #metodo para mostrar uma gaveta
    render json: @drawer #renderiza o json com a gaveta
  end

  def create #metodo para criar uma gaveta
    drawer = @freezer.drawers.new(drawer_params.except(:freezer_id)) #cria uma gaveta ligada ao freezer; freezer_id ja vem da url

    if drawer.save #se a gaveta for salva
      render json: drawer, status: :created #renderiza o json com a gaveta e o status created
    else
      render_validation_errors(drawer) #renderiza o json com os erros de validacao
    end
  end

  def update #metodo para atualizar uma gaveta
    attrs = drawer_params #pega os parametros da gaveta
    Freezer.kept.find(attrs[:freezer_id]) if attrs[:freezer_id].present? #se mandou freezer_id, confere se o freezer existe e esta ativo

    if @drawer.update(attrs) #se a gaveta for atualizada
      render json: @drawer #renderiza o json com a gaveta
    else
      render_validation_errors(@drawer) #renderiza o json com os erros de validacao
    end
  end

  def destroy #MVP: exclusao definitiva (cascata via dependent: :destroy)
    # HierarchyTrash.discard!(@drawer) #FUTURO: soft-delete / lixeira
    @drawer.destroy! #apaga a gaveta e filhos
    head :no_content #retorna 204 sem corpo
  end


  private #metodos privados para nao serem acessados externamente

  def set_freezer #metodo para setar o freezer pai
    @freezer = Freezer.kept.find(params[:freezer_id]) #pega o freezer ativo pelo freezer_id da url
  end

  def set_drawer #metodo para setar a gaveta
    @drawer = @freezer.drawers.kept.find(params[:id]) #pega a gaveta ativa dentro daquele freezer
  end

  def drawer_params #metodo para pegar os parametros da gaveta
    params.require(:drawer).permit(:name, :freezer_id) #permite name e freezer_id (para mover de freezer)
  end
end
