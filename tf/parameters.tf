// Login
data "aws_ssm_parameter" "jwt_private_key" {
  name = "/notifycal/${var.environment}/backend/jwt-private-key"
}
data "aws_ssm_parameter" "jwt_algorithm" {
  name = "/notifycal/${var.environment}/backend/jwt-algorithm"
}
data "aws_ssm_parameter" "jwt_issuer" {
  name = "/notifycal/${var.environment}/backend/jwt-issuer"
}
data "aws_ssm_parameter" "jwt_audience" {
  name = "/notifycal/${var.environment}/backend/jwt-audience"
}
data "aws_ssm_parameter" "jwt_expiration" {
  name = "/notifycal/${var.environment}/backend/jwt-expiration"
}
data "aws_ssm_parameter" "google_oauth_client_id" {
  name = "/notifycal/${var.environment}/backend/google-oauth-client-id"
}
data "aws_ssm_parameter" "google_oauth_client_secret" {
  name = "/notifycal/${var.environment}/backend/google-oauth-client-secret"
}
data "aws_ssm_parameter" "google_oauth_client_redirect_url" {
  name = "/notifycal/${var.environment}/backend/google-oauth-redirect_url"
}

// Jwt Decoding. jwt_issuer, jwt_audience and jwt_expiration are also required
data "aws_ssm_parameter" "jwt_public_key" {
  name = "/notifycal/${var.environment}/backend/jwt-public-key"
}