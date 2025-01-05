data "aws_iam_policy_document" "post_refresh_iam_policydoc" {
  statement {
    effect = "Allow"

    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
    ]

    resources = [
      aws_dynamodb_table.refresh_tokens.arn
    ]
  }
}

module "post_refresh_lambda" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 7.17"

  function_name          = "post-refresh-${var.environment}"
  publish                = true
  create_package         = false
  local_existing_package = "${path.root}/../dist/lambdas/api/post-refresh.zip"

  runtime     = "nodejs22.x"
  timeout     = 30
  memory_size = 256
  handler     = "index.handler"

  logging_log_format    = "JSON"
  attach_tracing_policy = true
  tracing_mode          = "Active"

  maximum_retry_attempts = 0

  tags = merge({
    Api = "POST /refresh"
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
  policy_json        = data.aws_iam_policy_document.post_refresh_iam_policydoc.json

  environment_variables = merge({
    REFRESH_JWT_PUBLIC_KEY    = data.aws_ssm_parameter.refresh_jwt_public_key.value
    REFRESH_TOKENS_TABLE_NAME = aws_dynamodb_table.refresh_tokens.name
  }, local.login_and_refresh_env_vars, local.common_lambda_env_vars)
}
