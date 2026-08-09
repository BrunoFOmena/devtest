# Be sure to restart your server when you modify this file. #reinicie o server depois de mudar

# Read more: https://github.com/cyu/rack-cors

Rails.application.config.middleware.insert_before 0, Rack::Cors do #liga o middleware CORS no inicio da pilha
  allow do #define quem pode chamar a API
    origins "http://localhost:5173", "http://127.0.0.1:5173" #origem do Vite (frontend)

    resource "*", #libera todos os paths
      headers: :any, #aceita qualquer header
      methods: %i[get post put patch delete options head] #verbos HTTP permitidos
  end
end
