module SoftDeletable #modulo reutilizavel de soft delete (lixeira)
  extend ActiveSupport::Concern #permite usar include SoftDeletable nos models

  included do #codigo que roda quando o model inclui este concern
    scope :kept, -> { where(discarded_at: nil) } #registros ativos (nao foram para a lixeira)
    scope :discarded, -> { where.not(discarded_at: nil) } #registros na lixeira
  end

  def discarded? #pergunta se este registro esta na lixeira
    discarded_at.present? #true se discarded_at tem data
  end

  def discard! #manda para a lixeira
    update!(discarded_at: Time.current) unless discarded? #marca a data atual, se ainda nao estava descartado
  end

  def undiscard! #tira da lixeira (restaura)
    update!(discarded_at: nil) if discarded? #limpa discarded_at se estava descartado
  end
end
