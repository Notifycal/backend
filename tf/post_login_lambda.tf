module "post_login_lambda" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 7.17"

  function_name          = "post-login-${var.environment}"
  publish                = true
  create_package         = false
  local_existing_package = "${path.root}/../dist/lambdas/api/post-login.zip"

  runtime     = "nodejs22.x"
  timeout     = 30
  memory_size = 128
  handler     = "index.handler"

  logging_log_format    = "JSON"
  attach_tracing_policy = true
  tracing_mode          = "Active"

  maximum_retry_attempts = 0

  tags = merge({
    Api = "POST /login"
  }, local.common_tags)

  allowed_triggers = {
    AllowAPIGatewayInvoke = {
      principal = "apigateway.amazonaws.com"
      source_arn = format("arn:aws:execute-api:%s:%s:%s/%s/*/*",
        var.aws_region,
        local.aws_account_id,
        aws_api_gateway_rest_api.auth_service.id,
        var.api_stage_name
      )
    }
  }

  environment_variables = merge({
    GOOGLE_OAUTH_CLIENT_ID           = data.aws_ssm_parameter.google_oauth_client_id.value
    GOOGLE_OAUTH_CLIENT_SECRET       = data.aws_ssm_parameter.google_oauth_client_secret.value
    GOOGLE_OAUTH_CLIENT_REDIRECT_URI = data.aws_ssm_parameter.google_oauth_client_redirect_url.value
    USERS_TABLE_NAME                 = aws_dynamodb_table.users.name
    REFRESH_TOKENS_TABLE_NAME        = aws_dynamodb_table.refresh_tokens.name
  }, local.login_and_refresh_env_vars, local.common_lambda_env_vars)
}
