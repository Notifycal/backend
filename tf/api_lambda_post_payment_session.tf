module "post_payment_session_lambda" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 7.17"

  function_name          = "post-payment-session-${var.environment}"
  publish                = local.lambdas_publish
  create_package         = local.lambdas_create_package
  local_existing_package = "${path.root}/../dist/lambdas/api/post-payment-session.zip"

  runtime     = var.lambdas_runtime
  timeout     = local.api_lambdas_timeout
  memory_size = 512
  handler     = var.lambdas_handler_name

  layers = local.lambdas_layers

  logging_log_format    = var.lambdas_logging_log_format
  attach_tracing_policy = local.lambdas_attach_tracing_policy
  tracing_mode          = local.lambdas_tracing_mode

  maximum_retry_attempts = 0

  tags = merge({
    Api = "POST /payment-session"
  }, local.common_tags)

  attach_policies    = true
  policies           = local.lambdas_shared_iam_policies
  number_of_policies = length(local.lambdas_shared_iam_policies)

  environment_variables = merge({
    STRIPE_API_KEY              = var.stripe_operating_api_key
    STRIPE_GOOD_TIER_PRICE_ID   = var.subscription_tiers["good"].price_id
    STRIPE_BETTER_TIER_PRICE_ID = var.subscription_tiers["better"].price_id
    STRIPE_BEST_TIER_PRICE_ID   = var.subscription_tiers["best"].price_id
    STRIPE_SUCCESS_REDIRECT_URL = "${var.frontend_domain}/#/payment-success"
    STRIPE_CANCEL_REDIRECT_URL  = "${var.frontend_domain}/#/payment-cancel"
  }, local.protected_endpoint_env_vars, local.common_lambda_env_vars, local.common_api_lambda_env_vars)
}

module "post_payment_session_lambda_alias" {
  source  = "terraform-aws-modules/lambda/aws//modules/alias"
  version = "~> 7.17"

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
