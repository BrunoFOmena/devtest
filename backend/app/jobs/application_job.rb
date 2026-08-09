class ApplicationJob < ActiveJob::Base #classe base dos jobs (tarefas em segundo plano)
  # Automatically retry jobs that encountered a deadlock #recria job se der deadlock no banco
  # retry_on ActiveRecord::Deadlocked

  # Most jobs are safe to ignore if the underlying records are no longer available #descarta job se o registro sumiu
  # discard_on ActiveJob::DeserializationError
end
