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
  publish                = true
  create_package         = false
  local_existing_package = "${path.root}/../dist/lambdas/api/get-user-profile.zip"

  runtime     = "nodejs22.x"
  timeout     = 30
  memory_size = 128
  handler     = "index.handler"

  logging_log_format    = "JSON"
  attach_tracing_policy = true
  tracing_mode          = "Active"

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
    USERS_TABLE_NAME = aws_dynamodb_table.users.name
    ACCESS_JWT_PUBLIC_KEY = data.aws_ssm_parameter.access_jwt_public_key.value
  }, local.protected_endpoint_env_vars)
}
