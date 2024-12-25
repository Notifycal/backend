// Login
data "aws_ssm_parameter" "jwt_private_key" {
  name        = "/notifycal/${var.environment}/backend/jwt-private-key"
  description = "Private key used to generate JWT access token"
  type        = "SecureString"
}
data "aws_ssm_parameter" "jwt_algorithm" {
  name        = "/notifycal/${var.environment}/backend/jwt-algorithm"
  description = "Signing algorithm to use for generating JWT access token"
  type        = "String"
}
data "aws_ssm_parameter" "jwt_issuer" {
  name        = "/notifycal/${var.environment}/backend/jwt-issuer"
  description = "Issuer to use in JWT access token"
  type        = "String"
}
data "aws_ssm_parameter" "jwt_audience" {
  name        = "/notifycal/${var.environment}/backend/jwt-audience"
  description = "Audience to use in JWT access token"
  type        = "String"
}
data "aws_ssm_parameter" "jwt_expiration" {
  name        = "/notifycal/${var.environment}/backend/jwt-expiration"
  description = "Expiration to use in JWT access token"
  type        = "String"
}
data "aws_ssm_parameter" "google_oauth_client_id" {
  name        = "/notifycal/${var.environment}/backend/google-oauth-client-id"
  description = "Google OAuth client ID"
  type        = "String"
}
data "aws_ssm_parameter" "google_oauth_client_secret" {
  name        = "/notifycal/${var.environment}/backend/google-oauth-client-secret"
  description = "Google OAuth client secret"
  type        = "SecureString"
}
data "aws_ssm_parameter" "google_oauth_client_redirect_url" {
  name        = "/notifycal/${var.environment}/backend/google-oauth-redirect_url"
  description = "Google OAuth redirect url"
  type        = "String"
}
