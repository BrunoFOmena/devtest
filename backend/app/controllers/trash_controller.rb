class TrashController < ApplicationController #herda da classe ApplicationController
  def index #metodo para listar o que esta na lixeira
    render json: HierarchyTrash.list #devolve a lista de itens descartados
  end

  def restore #metodo para restaurar um item da lixeira
    item = HierarchyTrash.restore!(params[:type], params[:id]) #restaura pelo tipo e id da url
    render json: item #devolve o item restaurado
  rescue ActiveRecord::RecordNotFound #item nao existe na lixeira
    render_error("Item não encontrado na lixeira.", status: :not_found) #retorna 404
  rescue ArgumentError => e #tipo invalido ou outro erro de argumento
    render_error(e.message) #devolve a mensagem do erro
  end
end
