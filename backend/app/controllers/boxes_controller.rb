class BoxesController < ApplicationController #herda da classe ApplicationController
  before_action :set_drawer #antes de qualquer action, set_drawer sera executado
  before_action :set_box, only: %i[show update destroy] #antes de show, update ou destroy, set_box sera executado

  def index #metodo para listar os boxes
    render json: @drawer.boxes.kept.order(:name) #renderiza o json com os boxes ativos ordenados pelo nome
  end

  def show #metodo para mostrar um box
    render json: @box #renderiza o json com o box
  end

  def create #metodo para criar um box
    box = @drawer.boxes.new(box_params.except(:drawer_id)) #cria um novo box; drawer_id ja vem da url; grade nasce no after_create

    if box.save #se o box for salvo
      render json: box, status: :created #renderiza o json com o box e o status created
    else
      render_validation_errors(box) #renderiza o json com os erros de validacao
    end
  end

  def update #metodo para atualizar um box
    attrs = box_params #pega os parametros do box
    Drawer.kept.find(attrs[:drawer_id]) if attrs[:drawer_id].present? #se mandou drawer_id, confere se a gaveta existe e esta ativa

    if @box.update(attrs) #se o box for atualizado
      render json: @box #renderiza o json com o box
    else
      render_validation_errors(@box) #renderiza o json com os erros de validacao
    end
  end

  def destroy #MVP: exclusao definitiva (cascata via dependent: :destroy)
    # HierarchyTrash.discard!(@box) #FUTURO: soft-delete / lixeira
    @box.destroy! #apaga a caixa e posicoes
    head :no_content #retorna 204 sem corpo
  end


  private #metodos privados para nao serem acessados externamente

  def set_drawer #metodo para setar o drawer
    @drawer = Drawer.kept.find(params[:drawer_id]) #pega a gaveta ativa pelo drawer_id da url
  end

  def set_box #metodo para setar o box
    @box = @drawer.boxes.kept.find(params[:id]) #pega o box ativo dentro daquela gaveta
  end

  def box_params #metodo para pegar os parametros do box
    params.require(:box).permit(:name, :rows, :columns, :drawer_id) #permite name, rows, columns e drawer_id
  end
end
