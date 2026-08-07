Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  resources :rooms, only: %i[index show create update destroy] do
    resources :freezers, only: %i[index show create update destroy]
  end

  resources :freezers, only: [] do
    resources :drawers, only: %i[index show create update destroy]
  end

  resources :drawers, only: [] do
    resources :boxes, only: %i[index show create update destroy]
  end

  resources :boxes, only: [] do
    resources :positions, only: %i[index]
  end

  resources :samples, only: %i[index create] do
    collection do
      post :suggest
      get :search
    end
  end
end
