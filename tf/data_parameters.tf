data "aws_ssm_parameter" "google_oauth_client_id" {
  name = "/notifycal/${var.environment}/providers/google/oauth/client-id"
}

data "aws_ssm_parameter" "google_oauth_client_secret" {
  name = "/notifycal/${var.environment}/providers/google/oauth/client-secret"
}

data "aws_ssm_parameter" "google_oauth_client_redirect_url" {
  name = "/notifycal/${var.environment}/providers/google/oauth/redirect-url"
}
