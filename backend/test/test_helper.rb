ENV["RAILS_ENV"] ||= "test" #garante ambiente test
require_relative "../config/environment" #carrega a app Rails
require "rails/test_help" #helpers do Minitest/Rails
require_relative "support/domain_test_helper" #helpers create_box / occupy

module ActiveSupport
  class TestCase #classe base de todos os testes
    include DomainTestHelper #disponibiliza create_box e occupy

    # Requisicoes HTTP em integration tests podem persistir fora da transacao do teste.
    setup { Room.destroy_all } #limpa o banco antes de cada teste (cascata)

    # Threads compartilham o mesmo banco de teste; usar 1 worker evita interferencia entre arquivos.
    parallelize(workers: 1) #roda testes em serie

    # Add more helper methods to be used by all tests here...
  end
end
