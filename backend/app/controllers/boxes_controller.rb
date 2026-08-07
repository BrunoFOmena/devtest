class BoxesController < ApplicationController
  before_action :set_drawer
  before_action :set_box, only: %i[show update destroy]

  def index
    render json: @drawer.boxes.order(:name)
  end

  def show
    render json: @box
  end

  def create
    box = @drawer.boxes.new(box_params)

    if box.save
      render json: box, status: :created
    else
      render_validation_errors(box)
    end
  end

  def update
    if @box.update(box_params)
      render json: @box
    else
      render_validation_errors(@box)
    end
  end

  def destroy
    @box.destroy!
    head :no_content
  end

  private

  def set_drawer
    @drawer = Drawer.find(params[:drawer_id])
  end

  def set_box
    @box = @drawer.boxes.find(params[:id])
  end

  def box_params
    params.require(:box).permit(:name, :rows, :columns)
  end
end
