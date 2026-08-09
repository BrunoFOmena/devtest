require_relative "boot" #carrega bundler e bootsnap

require "rails/all" #carrega todos os frameworks do Rails

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups) #carrega as gems do grupo do ambiente atual

module Backend #nome do modulo da aplicacao
  class Application < Rails::Application #classe principal da app Rails
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 8.1 #defaults do Rails 8.1

    # Please, add to the `ignore` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    # Common ones are `templates`, `generators`, or `middleware`, for example.
    config.autoload_lib(ignore: %w[assets tasks]) #autoload de lib/, ignorando assets e tasks

    # Configuration for the application, engines, and railties goes here.
    #
    # These settings can be overridden in specific environments using the files
    # in config/environments, which are processed later.
    #
    # config.time_zone = "Central Time (US & Canada)"
    # config.eager_load_paths << Rails.root.join("extras")

    # Only loads a smaller set of middleware suitable for API only apps.
    # Middleware like session, flash, cookies can be added back manually.
    # Skip views, helpers and assets when generating a new resource.
    config.api_only = true #API JSON pura (sem views HTML)
  end
end
