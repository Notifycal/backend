data "aws_iam_policy_document" "get_user_profile_iam_policydoc" {
  statement {
    effect = "Allow"

    actions = [
      "dynamodb:GetItem",
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

  attach_policy_json = true
  policy_json        = data.aws_iam_policy_document.get_user_profile_iam_policydoc.json

  environment_variables = merge({
    USERS_TABLE_NAME      = aws_dynamodb_table.users.name
    ACCESS_JWT_PUBLIC_KEY = data.aws_ssm_parameter.access_jwt_public_key.value
  }, local.protected_endpoint_env_vars)
}
