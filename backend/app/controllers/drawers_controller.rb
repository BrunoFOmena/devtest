class DrawersController < ApplicationController
  before_action :set_freezer
  before_action :set_drawer, only: %i[show update destroy]

  def index
    render json: @freezer.drawers.order(:name)
  end

  def show
    render json: @drawer
  end

  def create
    drawer = @freezer.drawers.new(drawer_params)

    if drawer.save
      render json: drawer, status: :created
    else
      render_validation_errors(drawer)
    end
  end

  def update
    if @drawer.update(drawer_params)
      render json: @drawer
    else
      render_validation_errors(@drawer)
    end
  end

  def destroy
    @drawer.destroy!
    head :no_content
  end

  private

  def set_freezer
    @freezer = Freezer.find(params[:freezer_id])
  end

  def set_drawer
    @drawer = @freezer.drawers.find(params[:id])
  end

  def drawer_params
    params.require(:drawer).permit(:name)
  end
end
