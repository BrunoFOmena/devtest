require "csv" #biblioteca padrao do Ruby para ler CSV

# Preview e import historico de amostras a partir de CSV (posicao explicita).
class CsvSampleImporter #service de importacao CSV
  REQUIRED = %w[ #colunas obrigatorias no arquivo
    sala freezer gaveta caixa posicao codigo_amostra paciente_nome material
  ].freeze

  HEADER_ALIASES = { #aceita nomes em PT/EN e normaliza para a chave interna
    "sala" => "sala",
    "room" => "sala",
    "freezer" => "freezer",
    "gaveta" => "gaveta",
    "drawer" => "gaveta",
    "caixa" => "caixa",
    "box" => "caixa",
    "linhas" => "linhas",
    "rows" => "linhas",
    "colunas" => "colunas",
    "columns" => "colunas",
    "posicao" => "posicao",
    "posição" => "posicao",
    "position" => "posicao",
    "codigo_amostra" => "codigo_amostra",
    "paciente_nome" => "paciente_nome",
    "concentracao_ng_ul" => "concentracao_ng_ul",
    "concentracao" => "concentracao_ng_ul",
    "material" => "material",
    "exame" => "exame",
    "observacao" => "observacao",
    "observação" => "observacao"
  }.freeze

  def self.preview_csv(content) #atalho: preview a partir do texto/arquivo CSV
    new.preview_csv(content)
  end

  def self.preview_rows(rows) #atalho: preview a partir de array de linhas
    new.preview_rows(rows)
  end

  def self.import!(rows) #atalho: importa linhas ja validadas
    new.import!(rows)
  end

  def preview_csv(content) #le o CSV e classifica ok / rejected
    rows = parse_csv(content) #parseia e normaliza
    classify(rows) #separa ok e erros
  end

  def preview_rows(rows) #normaliza array e classifica
    normalized = Array(rows).map.with_index(1) { |row, index| normalize_row(row, index) } #normaliza cada linha
    classify(normalized)
  end

  def import!(rows) #grava no banco so se nao houver rejeitadas
    normalized = Array(rows).map.with_index(1) { |row, index| normalize_row(row, index) }
    preview = classify(normalized) #revalida antes de importar

    unless preview[:rejected].empty? #se ainda tem erro
      raise ArgumentError, "Existem linhas rejeitadas. Corrija ou remova antes de importar."
    end

    created = { rooms: 0, freezers: 0, drawers: 0, boxes: 0, samples: 0 } #contadores do que foi criado

    ActiveRecord::Base.transaction do #tudo ou nada
      preview[:ok].each do |item| #cada linha ok
        counts = persist_row!(item[:data]) #cria hierarquia + amostra
        counts.each { |key, value| created[key] += value } #soma contadores
      end
    end

    { imported: preview[:ok].size, created: created } #resumo da importacao
  end

  private #metodos privados

  def parse_csv(content) #transforma texto CSV em array de hashes normalizados
    table = CSV.parse(content.to_s.delete_prefix("\uFEFF"), headers: true, liberal_parsing: true) #remove BOM e le cabecalho
    raise ArgumentError, "CSV vazio ou sem cabeçalho." if table.headers.blank?

    mapped_headers = table.headers.map { |header| HEADER_ALIASES[header.to_s.strip.downcase] } #mapeia cabecalhos
    missing = REQUIRED - mapped_headers.compact #quais obrigatorias faltaram
    raise ArgumentError, "Colunas obrigatórias ausentes: #{missing.join(', ')}" if missing.any?

    table.each_with_index.map do |csv_row, index| #cada linha do CSV
      raw = {}
      table.headers.each_with_index do |header, i| #percorre colunas
        key = HEADER_ALIASES[header.to_s.strip.downcase] #chave normalizada
        next unless key #ignora coluna desconhecida

        raw[key] = csv_row[i].to_s #copia o valor
      end
      normalize_row(raw, index + 1) #normaliza e marca o numero da linha
    end
  end

  def normalize_row(row, line) #padroniza uma linha (trim, upcase da posicao, etc.)
    hash = row.respond_to?(:to_unsafe_h) ? row.to_unsafe_h : row.to_h #hash seguro
    hash = hash.transform_keys { |key| key.to_s } #chaves como string

    {
      "line" => hash["line"].presence&.to_i || line, #numero da linha no arquivo
      "sala" => hash["sala"].to_s.strip,
      "freezer" => hash["freezer"].to_s.strip,
      "gaveta" => hash["gaveta"].to_s.strip,
      "caixa" => hash["caixa"].to_s.strip,
      "linhas" => hash["linhas"].to_s.strip,
      "colunas" => hash["colunas"].to_s.strip,
      "posicao" => hash["posicao"].to_s.strip.upcase, #A1 em maiusculo
      "codigo_amostra" => hash["codigo_amostra"].to_s.strip,
      "paciente_nome" => hash["paciente_nome"].to_s.strip,
      "concentracao_ng_ul" => blank_to_nil(hash["concentracao_ng_ul"]), #vazio vira nil
      "material" => hash["material"].to_s.strip,
      "exame" => blank_to_nil(hash["exame"]),
      "observacao" => blank_to_nil(hash["observacao"])
    }
  end

  def blank_to_nil(value) #string vazia → nil
    text = value.to_s.strip
    text.empty? ? nil : text
  end

  def classify(rows) #separa linhas ok e rejected (error/duplicate)
    ok = []
    rejected = []
    codes_in_file = Hash.new { |h, k| h[k] = [] } #codigo → linhas onde aparece

    rows.each do |row| #mapeia codigos repetidos no arquivo
      codes_in_file[row["codigo_amostra"]] << row["line"] if row["codigo_amostra"].present?
    end

    existing_codes = Sample.where(codigo_amostra: rows.map { |r| r["codigo_amostra"] }.reject(&:blank?)).pluck(:codigo_amostra).to_set #codigos ja no banco
    box_dims = {} #cache das dimensoes por caixa
    positions_in_file = Hash.new { |h, k| h[k] = [] } #posicao → linhas onde aparece

    rows.each do |row| #mapeia posicoes repetidas no arquivo
      pos_key = [row["sala"], row["freezer"], row["gaveta"], row["caixa"], row["posicao"]].join("|")
      positions_in_file[pos_key] << row["line"] if row["posicao"].present?
    end

    rows.each do |row| #valida cada linha
      errors = structural_errors(row, box_dims) #erros de estrutura/grade
      reasons = errors.dup

      pos_key = [row["sala"], row["freezer"], row["gaveta"], row["caixa"], row["posicao"]].join("|")
      if row["posicao"].present? && positions_in_file[pos_key].size > 1 #mesma celula duas vezes no CSV
        reasons << "Posição repetida no arquivo (linhas #{positions_in_file[pos_key].join(', ')})"
      end

      code = row["codigo_amostra"]
      if code.present?
        file_dupes = codes_in_file[code]
        if file_dupes.size > 1 #codigo repetido no arquivo
          reasons << "Código repetido no arquivo (linhas #{file_dupes.join(', ')}). Escolha qual manter."
        elsif existing_codes.include?(code) #codigo ja existe no sistema
          reasons << "Código já cadastrado no sistema. Descarte ou altere o código para importar."
        end
      end

      if reasons.any? #tem algum problema
        # Amarelo: so conflito de codigo. Qualquer outro erro estrutural → vermelho.
        only_code_duplicate = reasons.all? { |reason| reason.include?("Código") }
        rejected << {
          status: only_code_duplicate ? "duplicate" : "error", #duplicate = amarelo; error = vermelho
          reasons: reasons.uniq,
          data: row
        }
      else
        ok << { status: "ok", reasons: [], data: row } #linha pronta para importar
      end
    end

    { ok: ok, rejected: rejected } #resultado do preview
  end

  def structural_errors(row, box_dims) #erros de campos, dimensoes e posicao
    errors = []

    REQUIRED.each do |field| #checa obrigatorios
      errors << "Campo obrigatório vazio: #{field}" if row[field].blank?
    end

    rows = parse_positive_int(row["linhas"]) #linhas da grade
    cols = parse_positive_int(row["colunas"]) #colunas da grade

    if row["linhas"].present? && rows.nil?
      errors << "linhas inválido"
    end
    if row["colunas"].present? && cols.nil?
      errors << "colunas inválido"
    end

    box_key = [row["sala"], row["freezer"], row["gaveta"], row["caixa"]].join(" / ") #chave da caixa
    existing_box = find_existing_box(row) #caixa ja existe no banco?

    if existing_box #caixa ja cadastrada
      box_dims[box_key] ||= [existing_box.rows, existing_box.columns] #usa dimensoes do banco
      if rows && cols && [rows, cols] != [existing_box.rows, existing_box.columns] #CSV bateu com outra grade
        errors << "Caixa já existe com grade #{existing_box.rows}×#{existing_box.columns} (CSV: #{rows}×#{cols})"
      end
    elsif rows && cols #caixa nova com dimensoes no CSV
      if box_dims.key?(box_key) && box_dims[box_key] != [rows, cols] #duas linhas do CSV discordam
        errors << "Dimensões da caixa conflitantes com outra linha (#{box_dims[box_key].join('×')} vs #{rows}×#{cols})"
      else
        box_dims[box_key] ||= [rows, cols]
      end
    elsif row["caixa"].present?
      # Nova caixa sem dimensoes: assume padrao 8×12 na validacao/criacao.
      box_dims[box_key] ||= [8, 12]
    end

    parsed = parse_position(row["posicao"]) #A1 → { row: "A", column: 1 }
    if row["posicao"].present? && parsed.nil?
      errors << "Posição inválida (use formato A1, B2…)"
    elsif parsed
      dims = box_dims[box_key]
      if dims #checa se a celula cabe na grade
        max_row_index = dims[0] - 1
        max_col = dims[1]
        row_index = parsed[:row].ord - "A".ord
        if row_index.negative? || row_index > max_row_index || parsed[:column] < 1 || parsed[:column] > max_col
          errors << "Posição #{row['posicao']} fora da grade #{dims[0]}×#{dims[1]}"
        end
      end

      if existing_box #se a caixa ja existe, checa se a celula ja tem amostra
        position = existing_box.positions.find_by(row: parsed[:row], column: parsed[:column])
        if position&.sample.present?
          errors << "Posição #{row['posicao']} já ocupada nesta caixa"
        end
      end
    end

    if row["concentracao_ng_ul"].present? #valida concentracao se veio preenchida
      begin
        value = BigDecimal(row["concentracao_ng_ul"].to_s)
        errors << "Concentração não pode ser negativa" if value.negative?
      rescue ArgumentError
        errors << "Concentração inválida"
      end
    end

    errors
  end

  def parse_positive_int(value) #converte string em inteiro; nil se invalido
    return nil if value.blank?

    Integer(value)
  rescue ArgumentError, TypeError
    nil
  end

  def parse_position(label) #parseia "A1" → { row: "A", column: 1 }
    return nil if label.blank?
    return nil unless label.match?(/\A[A-Z]+\d+\z/) #formato letra(s) + numero

    match = label.match(/\A([A-Z]+)(\d+)\z/)
    { row: match[1], column: match[2].to_i }
  end

  def find_existing_box(row) #busca caixa ativa pela hierarquia de nomes
    return nil if row.values_at("sala", "freezer", "gaveta", "caixa").any?(&:blank?)

    room = Room.kept.find_by(name: row["sala"])
    return nil unless room

    freezer = room.freezers.kept.find_by(name: row["freezer"])
    return nil unless freezer

    drawer = freezer.drawers.kept.find_by(name: row["gaveta"])
    return nil unless drawer

    drawer.boxes.kept.find_by(name: row["caixa"])
  end

  def persist_row!(data) #cria hierarquia (find-or-create) e grava a amostra
    created = { rooms: 0, freezers: 0, drawers: 0, boxes: 0, samples: 0 }

    room = Room.kept.find_by(name: data["sala"])
    unless room #sala nao existe: cria
      room = Room.create!(name: data["sala"])
      created[:rooms] += 1
    end

    freezer = room.freezers.kept.find_by(name: data["freezer"])
    unless freezer
      freezer = room.freezers.create!(name: data["freezer"])
      created[:freezers] += 1
    end

    drawer = freezer.drawers.kept.find_by(name: data["gaveta"])
    unless drawer
      drawer = freezer.drawers.create!(name: data["gaveta"])
      created[:drawers] += 1
    end

    box = drawer.boxes.kept.find_by(name: data["caixa"])
    unless box #caixa nova: usa linhas/colunas do CSV ou padrao 8×12
      rows = parse_positive_int(data["linhas"]) || 8
      cols = parse_positive_int(data["colunas"]) || 12
      box = drawer.boxes.create!(name: data["caixa"], rows: rows, columns: cols) #after_create gera a grade
      created[:boxes] += 1
    end

    parsed = parse_position(data["posicao"])
    position = box.positions.find_by!(row: parsed[:row], column: parsed[:column]) #celula obrigatoria

    if position.sample.present? #protecao final contra corrida
      raise ArgumentError, "Posição #{data['posicao']} já ocupada na caixa #{data['caixa']} (linha #{data['line']})"
    end

    if Sample.exists?(codigo_amostra: data["codigo_amostra"]) #protecao final de codigo unico
      raise ArgumentError, "Código #{data['codigo_amostra']} já existe (linha #{data['line']})"
    end

    concentracao = data["concentracao_ng_ul"]
    concentracao = BigDecimal(concentracao.to_s) if concentracao.present? #converte para decimal

    Sample.create!( #grava a amostra na posicao do CSV (nao usa first-fit)
      position: position,
      codigo_amostra: data["codigo_amostra"],
      paciente_nome: data["paciente_nome"],
      material: data["material"],
      concentracao_ng_ul: concentracao,
      exame: data["exame"],
      observacao: data["observacao"]
    )
    created[:samples] += 1

    created #devolve contadores desta linha
  end
end
