class ApplicationRecord < ActiveRecord::Base #classe base de todos os models
  primary_abstract_class #nao cria tabela propria; so serve de pai para Room, Sample, etc.
end
