data "aws_iam_policy_document" "post_payment_session_iam_policydoc" {
  statement {
    effect = "Allow"

    actions = [
      "dynamodb:Query",
      "dynamodb:UpdateItem",
    ]

    resources = [
      aws_dynamodb_table.users.arn
    ]
  }
}


module "post_payment_session_lambda" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 8.0"

  function_name          = "post-payment-session-${var.environment}"
  publish                = local.lambdas_publish
  create_package         = local.lambdas_create_package
  local_existing_package = "${path.root}/../dist/lambdas/api/post-payment-session.zip"

  runtime     = var.lambdas_runtime
  timeout     = local.api_lambdas_timeout
  memory_size = 512
  handler     = var.lambdas_handler_name

  layers = local.lambdas_layers

  cloudwatch_logs_retention_in_days = var.lambda_logging.retention_in_days
  logging_log_format                = var.lambda_logging.format
  attach_tracing_policy             = local.lambdas_attach_tracing_policy
  tracing_mode                      = local.lambdas_tracing_mode

  maximum_retry_attempts = 0

  tags = merge({
    Api = "POST /payment-session"
  }, local.common_tags)

  attach_policy_json = true
  policy_json        = data.aws_iam_policy_document.post_payment_session_iam_policydoc.json

  attach_policies    = true
  policies           = local.lambdas_shared_iam_policies
  number_of_policies = length(local.lambdas_shared_iam_policies)

  environment_variables = merge({
    STRIPE_SUCCESS_REDIRECT_URL_PATH             = "/#/payment-success"
    STRIPE_CANCEL_SUBSCRIPTION_REDIRECT_URL_PATH = "/#/onboarding/tier-selection"
    STRIPE_CANCEL_TOPUP_REDIRECT_URL_PATH        = "/#/dashboard"
    STRIPE_TAX_ID                                = var.tax_id
  }, local.payment_plans_env_vars, local.users_persistance_env_vars, local.protected_endpoint_env_vars, local.stripe_auth_env_vars, local.common_lambda_env_vars, local.common_api_lambda_env_vars)
}

module "post_payment_session_lambda_alias" {
  source  = "terraform-aws-modules/lambda/aws//modules/alias"
  version = "~> 8.0"

  function_name    = module.post_payment_session_lambda.lambda_function_name
  function_version = module.post_payment_session_lambda.lambda_function_version
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
