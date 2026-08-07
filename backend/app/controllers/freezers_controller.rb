class FreezersController < ApplicationController
  before_action :set_room
  before_action :set_freezer, only: %i[show update destroy]

  def index
    render json: @room.freezers.order(:name)
  end

  def show
    render json: @freezer
  end

  def create
    freezer = @room.freezers.new(freezer_params)

    if freezer.save
      render json: freezer, status: :created
    else
      render_validation_errors(freezer)
    end
  end

  def update
    if @freezer.update(freezer_params)
      render json: @freezer
    else
      render_validation_errors(@freezer)
    end
  end

  def destroy
    @freezer.destroy!
    head :no_content
  end

  private

  def set_room
    @room = Room.find(params[:room_id])
  end

  def set_freezer
    @freezer = @room.freezers.find(params[:id])
  end

  def freezer_params
    params.require(:freezer).permit(:name)
  end
end
