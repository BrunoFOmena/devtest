# classe base para todos os controllers
#serve para tratar erros e validar parametros

class ApplicationController < ActionController::API #herda da classe ActionController::API
  rescue_from ActiveRecord::RecordNotFound do #faz o tratamento de erro para o not found
    render json: { error: "Not found" }, status: :not_found #retorna um json com o erro e o status
  end

  rescue_from ActionController::ParameterMissing do |exception| #faz o tratamento de erro para o parametro missing (parametro obrigatorio nao foi passado)
    render json: { error: exception.message }, status: :unprocessable_entity #retorna um json com o erro e o status
  end

  private #metodos privados para nao serem acessados externamente

  def render_error(message, status: :unprocessable_entity) #funcao para renderizar o erro
    render json: { error: message }, status: status #retorna um json com o erro e o status
  end

  def render_validation_errors(record) #funcao para renderizar os erros de validacao
    render json: { errors: record.errors }, status: :unprocessable_entity #retorna um json com os erros e o status
  end

  def location_payload(position) #funcao para retornar o payload da localizacao
    box = position.box #pega o box da posicao
    drawer = box.drawer #pega o drawer do box
    freezer = drawer.freezer #pega o freezer do drawer
    room = freezer.room #pega o room do freezer
    label = "#{position.row}#{position.column}" #pega o label da posicao

    {
      position_id: position.id, #pega o id da posicao
      label: label, #pega o label da posicao
      row: position.row, #pega a linha da posicao
      column: position.column, #pega a coluna da posicao
      room: room.name, #pega o nome do room
      freezer: freezer.name, #pega o nome do freezer
      drawer: drawer.name, #pega o nome do drawer
      box: box.name, #pega o nome do box
      linhas: box.rows, #pega o numero de linhas do box
      colunas: box.columns, #pega o numero de colunas do box
      room_id: room.id, #pega o id do room
      freezer_id: freezer.id, #pega o id do freezer
      drawer_id: drawer.id, #pega o id do drawer  
      box_id: box.id, #pega o id do box
      path: "#{room.name} / #{freezer.name} / #{drawer.name} / #{box.name} / #{label}" #pega o path da localizacao
    }
  end

  def sample_json(sample) #funcao para retornar o payload da amostra    
    location_payload(sample.position).merge( #merge para unir os payloads da localizacao e da amostra
      id: sample.id, #pega o id da amostra  
      codigo_amostra: sample.codigo_amostra, #pega o codigo da amostra
      paciente_nome: sample.paciente_nome, #pega o nome do paciente
      material: sample.material, #pega o material da amostra
      concentracao_ng_ul: sample.concentracao_ng_ul, #pega a concentracao da amostra
      exame: sample.exame, #pega o exame da amostra
      observacao: sample.observacao, #pega a observacao da amostra
      created_at: sample.created_at, #pega a data de criacao da amostra
      updated_at: sample.updated_at #pega a data de atualizacao da amostra
    )
  end
end
