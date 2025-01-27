data "aws_iam_policy_document" "post_login_iam_policydoc" {
  statement {
    effect = "Allow"

    actions = [
      "dynamodb:Query",
      "dynamodb:PutItem",
    ]

    resources = [
      aws_dynamodb_table.users.arn
    ]
  }
  statement {
    effect = "Allow"

    actions = [
      "dynamodb:PutItem",
    ]

    resources = [
      aws_dynamodb_table.refresh_tokens.arn
    ]
  }
}

module "post_login_lambda" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 7.17"

  function_name          = "post-login-${var.environment}"
  publish                = local.lambdas_publish
  create_package         = local.lambdas_create_package
  local_existing_package = "${path.root}/../dist/lambdas/api/post-login.zip"

  runtime     = var.lambdas_runtime
  timeout     = local.api_lambdas_timeout
  memory_size = 256
  handler     = var.lambdas_handler_name

  logging_log_format    = var.lambdas_logging_log_format
  attach_tracing_policy = local.lambdas_attach_tracing_policy
  tracing_mode          = var.lambdas_tracing_mode

  maximum_retry_attempts = 0

  tags = merge({
    Api = "POST /login"
  }, local.common_tags)

  attach_policy_json = true
  policy_json        = data.aws_iam_policy_document.post_login_iam_policydoc.json

  environment_variables = merge({
    GOOGLE_OAUTH_CLIENT_ID           = var.google_oauth_config.client_id
    GOOGLE_OAUTH_CLIENT_SECRET       = var.google_oauth_config.client_secret
    GOOGLE_OAUTH_CLIENT_REDIRECT_URI = var.google_oauth_config.redirect_url
    USERS_TABLE_NAME                 = aws_dynamodb_table.users.name
    REFRESH_TOKENS_TABLE_NAME        = aws_dynamodb_table.refresh_tokens.name
  }, local.login_and_refresh_env_vars, local.common_lambda_env_vars)
}

module "post_login_lambda_alias" {
  source  = "terraform-aws-modules/lambda/aws//modules/alias"
  version = "~> 7.17"

  function_name    = module.post_login_lambda.lambda_function_name
  function_version = module.post_login_lambda.lambda_function_version
  name             = var.lambdas_live_alias_name

  allowed_triggers = {
    AllowAPIGatewayInvoke = {
      principal = "apigateway.amazonaws.com"
      source_arn = format("arn:aws:execute-api:%s:%s:%s/%s/*/*",
        var.aws_region,
        local.aws_account_id,
        aws_api_gateway_rest_api.rest_api.id,
        var.api_stage_name
      )
    }
  }
}
