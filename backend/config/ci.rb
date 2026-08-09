# Run using bin/ci #pipeline local de CI

CI.run do #define os passos do bin/ci
  step "Setup", "bin/setup --skip-server" #prepara o ambiente sem subir server

  step "Style: Ruby", "bin/rubocop" #linter de estilo

  step "Security: Gem audit", "bin/bundler-audit" #auditoria de gems vulneraveis
  step "Security: Brakeman code analysis", "bin/brakeman --quiet --no-pager --exit-on-warn --exit-on-error" #analise estatica de seguranca
  step "Tests: Rails", "bin/rails test" #roda a suite de testes
  step "Tests: Seeds", "env RAILS_ENV=test bin/rails db:seed:replant" #reaplica seeds no test

  # Optional: Run system tests
  # step "Tests: System", "bin/rails test:system"

  # Optional: set a green GitHub commit status to unblock PR merge.
  # Requires the `gh` CLI and `gh extension install basecamp/gh-signoff`.
  # if success?
  #   step "Signoff: All systems go. Ready for merge and deploy.", "gh signoff"
  # else
  #   failure "Signoff: CI failed. Do not merge or deploy.", "Fix the issues and try again."
  # end
end
