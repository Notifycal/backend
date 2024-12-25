locals {
  common_lambda_env_vars = {
    # This is required for sourcemaps to work
    NODE_OPTIONS = "--enable-source-maps"
    ENVIRONMENT  = var.environment
    AWS_REGION = var.aws_region
  }

  common_tags = {
    ENVIRONMENT  = var.environment
    STACK        = "backend"
  }
}
