Rails.application.routes.draw do #mapa URL → controller#action
  get "up" => "rails/health#show", as: :rails_health_check #health check: API no ar?

  resources :rooms, only: %i[index show create update destroy] do #CRUD de salas
    resources :freezers, only: %i[index show create update destroy] #freezers dentro da sala
  end

  resources :freezers, only: [] do #freezers sem rotas proprias no topo
    resources :drawers, only: %i[index show create update destroy] #gavetas dentro do freezer
  end

  resources :drawers, only: [] do #gavetas sem rotas proprias no topo
    resources :boxes, only: %i[index show create update destroy] #caixas dentro da gaveta
  end

  resources :boxes, only: [] do #caixas sem rotas proprias no topo
    resources :positions, only: %i[index] #so lista a grade da caixa
  end

  resources :samples, only: %i[index create] do #lista e cria amostras
    collection do #rotas da colecao (sem :id)
      post :suggest #preview da posicao (first-fit)
      get :search #busca por codigo ou paciente
      post :import_preview #preview do CSV
      post :import #importa linhas ok do CSV
    end
  end

  get "trash", to: "trash#index" #lista a lixeira
  post "trash/:type/:id/restore", to: "trash#restore" #restaura item da lixeira
end
