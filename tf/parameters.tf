// Login % Refresh
data "aws_ssm_parameter" "access_jwt_private_key" {
  name = "/notifycal/${var.environment}/backend/access-jwt-private-key"
}
data "aws_ssm_parameter" "access_jwt_algorithm" {
  name = "/notifycal/${var.environment}/backend/access-jwt-algorithm"
}
data "aws_ssm_parameter" "access_jwt_issuer" {
  name = "/notifycal/${var.environment}/backend/access-jwt-issuer"
}
data "aws_ssm_parameter" "access_jwt_audience" {
  name = "/notifycal/${var.environment}/backend/access-jwt-audience"
}
data "aws_ssm_parameter" "access_jwt_expiration" {
  name = "/notifycal/${var.environment}/backend/access-jwt-expiration"
}
data "aws_ssm_parameter" "refresh_jwt_private_key" {
  name = "/notifycal/${var.environment}/backend/refresh-jwt-private-key"
}
data "aws_ssm_parameter" "refresh_jwt_algorithm" {
  name = "/notifycal/${var.environment}/backend/refresh-jwt-algorithm"
}
data "aws_ssm_parameter" "refresh_jwt_issuer" {
  name = "/notifycal/${var.environment}/backend/refresh-jwt-issuer"
}
data "aws_ssm_parameter" "refresh_jwt_audience" {
  name = "/notifycal/${var.environment}/backend/refresh-jwt-audience"
}
data "aws_ssm_parameter" "refresh_jwt_expiration" {
  name = "/notifycal/${var.environment}/backend/refresh-jwt-expiration"
}

// Login
data "aws_ssm_parameter" "google_oauth_client_id" {
  name = "/notifycal/${var.environment}/backend/google-oauth-client-id"
}
data "aws_ssm_parameter" "google_oauth_client_secret" {
  name = "/notifycal/${var.environment}/backend/google-oauth-client-secret"
}
data "aws_ssm_parameter" "google_oauth_client_redirect_url" {
  name = "/notifycal/${var.environment}/backend/google-oauth-redirect_url"
}

// Refresh
data "aws_ssm_parameter" "refresh_jwt_public_key" {
  name = "/notifycal/${var.environment}/backend/refresh-jwt-public-key"
}

// Jwt Decoding. jwt_issuer, jwt_audience and jwt_expiration are also required
data "aws_ssm_parameter" "access_jwt_public_key" {
  name = "/notifycal/${var.environment}/backend/access-jwt-public-key"
}
