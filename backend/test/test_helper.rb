ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"
require_relative "support/domain_test_helper"

module ActiveSupport
  class TestCase
    include DomainTestHelper

    # Requisicoes HTTP em integration tests podem persistir fora da transacao do teste.
    setup { Room.destroy_all }

    # Threads compartilham o mesmo banco de teste; usar 1 worker evita interferencia entre arquivos.
    parallelize(workers: 1)

    # Add more helper methods to be used by all tests here...
  end
end
