locals {
  common_lambda_env_vars = {
    # This is required for sourcemaps to work
    NODE_OPTIONS    = "--enable-source-maps"
    ENVIRONMENT     = var.environment
    FRONTEND_DOMAIN = var.frontend_domain
    APP_VERSION     = var.app_version
  }
  users_persistance_env_vars = {
    USERS_TABLE_NAME = aws_dynamodb_table.users.name
  }
  refresh_token_persistance_env_vars = {
    REFRESH_TOKENS_TABLE_NAME = aws_dynamodb_table.refresh_tokens.name
  }
  decode_access_jwt_env_vars = {
    ACCESS_JWT_PUBLIC_KEY = tls_private_key.jwt_access_key.public_key_pem
    ACCESS_JWT_ALGORITHM  = var.jwt_config.access.algorithm
    ACCESS_JWT_ISSUER     = var.jwt_config.access.issuer
    ACCESS_JWT_AUDIENCE   = var.jwt_config.access.audience
    ACCESS_JWT_EXPIRATION = var.jwt_config.access.expiration
  }
  protected_endpoint_env_vars = merge(local.decode_access_jwt_env_vars, local.common_lambda_env_vars)

  login_and_refresh_env_vars = merge({
    ACCESS_JWT_PRIVATE_KEY  = tls_private_key.jwt_access_key.private_key_pem
    REFRESH_JWT_PUBLIC_KEY  = tls_private_key.jwt_refresh_key.public_key_pem
    REFRESH_JWT_PRIVATE_KEY = tls_private_key.jwt_refresh_key.private_key_pem
    REFRESH_JWT_ALGORITHM   = var.jwt_config.refresh.algorithm
    REFRESH_JWT_ISSUER      = var.jwt_config.refresh.issuer
    REFRESH_JWT_AUDIENCE    = var.jwt_config.refresh.audience
    REFRESH_JWT_EXPIRATION  = var.jwt_config.refresh.expiration
  }, local.decode_access_jwt_env_vars, local.users_persistance_env_vars, local.refresh_token_persistance_env_vars)

  google_idp_config = {
    GOOGLE_OAUTH_CLIENT_ID           = var.google_oauth_config.client_id
    GOOGLE_OAUTH_CLIENT_SECRET       = var.google_oauth_config.client_secret
    GOOGLE_OAUTH_CLIENT_REDIRECT_URI = var.google_oauth_config.redirect_url
  }
  idps_configs = merge({}, local.google_idp_config)

  common_tags = {}

  # Timeout for API Lambdas. API Gateway will timeout after 30s in any case
  api_lambdas_timeout           = 30
  lambdas_publish               = true
  lambdas_create_package        = false
  lambdas_attach_tracing_policy = true
}
