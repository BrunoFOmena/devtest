ENV["BUNDLE_GEMFILE"] ||= File.expand_path("../Gemfile", __dir__) #aponta para o Gemfile do projeto

require "bundler/setup" #carrega as gems do Gemfile
require "bootsnap/setup" #acelera o boot cacheando operacoes caras
