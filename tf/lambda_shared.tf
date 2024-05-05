locals {
  common_lambda_env_vars = {
    # This is required for sourcemaps to work
    NODE_OPTIONS = "--enable-source-maps"
  }
}
