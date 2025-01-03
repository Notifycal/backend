locals {
  common_lambda_env_vars = {
    # This is required for sourcemaps to work
    NODE_OPTIONS = "--enable-source-maps"
    ENVIRONMENT  = var.environment
    FRONTEND_DOMAIN = var.frontend_domain
  }
  decode_access_jwt_env_vars = {
    ACCESS_JWT_PRIVATE_KEY = data.aws_ssm_parameter.access_jwt_private_key.value
    ACCESS_JWT_ALGORITHM   = data.aws_ssm_parameter.access_jwt_algorithm.value
    ACCESS_JWT_ISSUER      = data.aws_ssm_parameter.access_jwt_issuer.value
    ACCESS_JWT_AUDIENCE    = data.aws_ssm_parameter.access_jwt_audience.value
    ACCESS_JWT_EXPIRATION  = data.aws_ssm_parameter.access_jwt_expiration.value
  }
  protected_endpoint_env_vars = merge(local.decode_access_jwt_env_vars, local.common_lambda_env_vars)

  login_and_refresh_env_vars = merge({
    REFRESH_JWT_PRIVATE_KEY = data.aws_ssm_parameter.refresh_jwt_private_key.value
    REFRESH_JWT_ALGORITHM   = data.aws_ssm_parameter.refresh_jwt_algorithm.value
    REFRESH_JWT_ISSUER      = data.aws_ssm_parameter.refresh_jwt_issuer.value
    REFRESH_JWT_AUDIENCE    = data.aws_ssm_parameter.refresh_jwt_audience.value
    REFRESH_JWT_EXPIRATION  = data.aws_ssm_parameter.refresh_jwt_expiration.value
  }, local.decode_access_jwt_env_vars)

  common_tags = {}
}
