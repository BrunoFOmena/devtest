# This file is used by Rack-based servers to start the application. #ponto de entrada Rack

require_relative "config/environment" #carrega a aplicacao Rails

run Rails.application #entrega a app ao servidor (Puma)
Rails.application.load_server #carrega o servidor configurado
