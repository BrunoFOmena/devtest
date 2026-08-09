class SamplesController < ApplicationController #herda da classe ApplicationController
  def index #metodo para listar todas as amostras
    samples = Sample #consulta as amostras
      .includes(position: { box: { drawer: { freezer: :room } } }) #carrega a hierarquia inteira (evita N+1)
      .order(created_at: :desc) #mais recentes primeiro

    render json: samples.map { |sample| sample_json(sample) } #devolve amostra + localizacao
  end

  def suggest #preview: sugere posicao sem gravar
    position = SampleAllocator.call(scope_params) #chama o first-fit (com escopo opcional)

    if position.nil? #se nao houver vaga
      return render_error(SampleAllocator::FULL_MESSAGE) #retorna 422 "abrir nova caixa"
    end

    render json: location_payload(position) #devolve o caminho Sala → ... → A1
  end

  def create #metodo para cadastrar uma amostra de fato
    position = SampleAllocator.call(scope_params) #aloca de novo (nao reutiliza o suggest)

    if position.nil? #se nao houver vaga
      return render_error(SampleAllocator::FULL_MESSAGE) #retorna 422 "abrir nova caixa"
    end

    sample = Sample.new(sample_params.merge(position: position)) #monta a amostra ja com a posicao escolhida

    if sample.save #se a amostra for salva
      render json: sample_json(sample), status: :created #201 com amostra + localizacao
    else
      render_validation_errors(sample) #422 com erros (ex.: codigo duplicado)
    end
  end

  def search #busca por codigo ou nome do paciente
    query = params[:q].to_s.strip #pega o texto da busca e remove espacos

    if query.blank? #se nao mandou nada
      return render json: [] #devolve lista vazia
    end

    samples = Sample #consulta as amostras
      .where("codigo_amostra ILIKE :query OR paciente_nome ILIKE :query", query: "%#{query}%") #busca case insensitive
      .includes(position: { box: { drawer: { freezer: :room } } }) #carrega a hierarquia
      .order(:codigo_amostra) #ordena pelo codigo
      .limit(50) #no maximo 50 resultados

    render json: samples.map { |sample| sample_json(sample) } #devolve amostra + localizacao
  end

  def import_preview #preview do CSV: separa linhas ok, erro e duplicata
    if params[:csv].present? #se mandou arquivo/conteudo CSV
      content = params[:csv].respond_to?(:read) ? params[:csv].read : params[:csv].to_s #le o arquivo ou usa a string
      result = CsvSampleImporter.preview_csv(content) #valida o CSV
    elsif params[:rows].present? #se mandou array de linhas ja parseadas
      result = CsvSampleImporter.preview_rows(params[:rows]) #valida as rows
    else
      return render_error("Envie o arquivo CSV ou a lista de linhas (rows).") #falta dado de entrada
    end

    render json: result #devolve o resultado do preview
  rescue ArgumentError => e #erro de argumento no importer
    render_error(e.message) #devolve a mensagem do erro
  end

  def import #importa so as linhas ja validadas como ok
    rows = params.require(:rows) #exige o array rows
    result = CsvSampleImporter.import!(rows) #cria hierarquia + amostras
    render json: result, status: :created #201 com o resultado da importacao
  rescue ActionController::ParameterMissing #nao mandou rows
    render_error("Envie o array rows com as linhas a importar.") #mensagem amigavel
  rescue ArgumentError => e #erro de argumento no importer
    render_error(e.message) #devolve a mensagem do erro
  end

  private #metodos privados para nao serem acessados externamente

  def scope_params #escopo opcional do first-fit (sala/freezer/gaveta/caixa)
    params.permit(:room_id, :freezer_id, :drawer_id, :box_id).to_h.symbolize_keys #permite esses ids e vira hash com simbolos
  end

  def sample_params #metodo para pegar os parametros da amostra
    params.require(:sample).permit( #exige a chave sample e permite so estes campos
      :codigo_amostra, #codigo unico
      :paciente_nome, #nome do paciente
      :material, #tipo de material
      :concentracao_ng_ul, #concentracao (opcional)
      :exame, #exame (opcional)
      :observacao #observacao (opcional)
    )
  end
end
