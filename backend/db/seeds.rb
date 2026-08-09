# Seeds idempotentes: carregam dados de demonstracao a partir do CSV de exemplo.
# Pode rodar varias vezes com `bin/rails db:seed` sem duplicar amostras.
# Uso tipico: `bin/rails db:migrate` e depois `bin/rails db:seed`
# (ou `bin/rails db:setup`, que ja chama migrate + seed).

# Caminho do CSV na raiz do repositorio (um nivel acima de backend/).
csv_path = Rails.root.join("..", "amostras_exemplo.csv")

if !csv_path.exist?
  # Sem o arquivo, nao ha o que importar — avisa e encerra o seed.
  puts "Seeds: CSV nao encontrado em #{csv_path}"
elsif Sample.exists?
  # Idempotencia: se ja existe alguma amostra, assume que o seed ja rodou.
  puts "Seeds: banco ja tem amostras — pulando import."
else
  # Le o conteudo bruto do CSV (o importer remove BOM se houver).
  content = File.read(csv_path)

  # Preview classifica linhas em ok / rejected (duplicata, sem codigo, etc.).
  # O arquivo de exemplo tem codigo repetido e linha sem codigo_amostra;
  # por isso nao chamamos import! em todas as linhas do arquivo.
  preview = CsvSampleImporter.preview_csv(content)

  # Extrai so os hashes das linhas prontas para gravar.
  rows = preview[:ok].map { |item| item[:data] }

  if rows.empty?
    # Nada valido para importar (CSV so com erros, por exemplo).
    puts "Seeds: nenhuma linha ok no CSV."
  else
    # Reutiliza o mesmo service da API de importacao (hierarquia + amostras).
    result = CsvSampleImporter.import!(rows)
    puts "Seeds: importadas #{result[:imported]} amostras (#{result[:created]})."
  end

  # Mostra quantas linhas ficaram de fora (nao grava rejected).
  rejected = preview[:rejected].size
  puts "Seeds: #{rejected} linhas ignoradas (duplicata/erro)." if rejected.positive?
end
