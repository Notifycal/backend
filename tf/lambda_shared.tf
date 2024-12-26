locals {
  common_lambda_env_vars = {
    # This is required for sourcemaps to work
    NODE_OPTIONS = "--enable-source-maps"
    ENVIRONMENT  = var.environment
  }
  protected_endpoint_env_vars = merge({
    JWT_PUBLIC_KEY = data.aws_ssm_parameter.jwt_public_key.value
    JWT_ISSUER     = data.aws_ssm_parameter.jwt_issuer.value
    JWT_AUDIENCE   = data.aws_ssm_parameter.jwt_audience.value
    JWT_EXPIRATION = data.aws_ssm_parameter.jwt_expiration.value
  }, local.common_lambda_env_vars)

  common_tags = {}
}
