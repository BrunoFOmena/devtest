class ApplicationMailer < ActionMailer::Base #classe base dos e-mails do Rails
  default from: "from@example.com" #remetente padrao dos e-mails
  layout "mailer" #layout HTML padrao dos e-mails
end
