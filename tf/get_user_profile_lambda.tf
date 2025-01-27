data "aws_iam_policy_document" "get_user_profile_iam_policydoc" {
  statement {
    effect = "Allow"

    actions = [
      "dynamodb:Query",
    ]

    resources = [
      aws_dynamodb_table.users.arn
    ]
  }
}

module "get_user_profile_lambda" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 7.17"

  function_name          = "get-user-profile-${var.environment}"
  publish                = local.lambdas_publish
  create_package         = local.lambdas_create_package
  local_existing_package = "${path.root}/../dist/lambdas/api/get-user-profile.zip"

  runtime     = var.lambdas_runtime
  timeout     = local.api_lambdas_timeout
  memory_size = 256
  handler     = var.lambdas_handler_name

  logging_log_format    = var.lambdas_logging_log_format
  attach_tracing_policy = local.lambdas_attach_tracing_policy
  tracing_mode          = var.lambdas_tracing_mode

  maximum_retry_attempts = 0

  tags = merge({
    Api = "GET /user-profile"
  }, local.common_tags)

  attach_policy_json = true
  policy_json        = data.aws_iam_policy_document.get_user_profile_iam_policydoc.json

  environment_variables = merge({
    USERS_TABLE_NAME      = aws_dynamodb_table.users.name
    ACCESS_JWT_PUBLIC_KEY = tls_private_key.jwt_access_key.public_key_pem
  }, local.protected_endpoint_env_vars)
}

module "get_user_profile_lambda_alias" {
  source  = "terraform-aws-modules/lambda/aws//modules/alias"
  version = "~> 7.17"

  function_name    = module.get_user_profile_lambda.lambda_function_name
  function_version = module.get_user_profile_lambda.lambda_function_version
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
