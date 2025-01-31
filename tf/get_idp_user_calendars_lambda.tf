module "get_idp_user_calendars_lambda" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 7.17"

  function_name          = "get-idp-user-calendars-${var.environment}"
  publish                = local.lambdas_publish
  create_package         = local.lambdas_create_package
  local_existing_package = "${path.root}/../dist/lambdas/api/idp/get-user-calendars.zip"

  runtime     = var.lambdas_runtime
  timeout     = local.api_lambdas_timeout
  memory_size = 384
  handler     = var.lambdas_handler_name

  logging_log_format    = var.lambdas_logging_log_format
  attach_tracing_policy = local.lambdas_attach_tracing_policy
  tracing_mode          = var.lambdas_tracing_mode

  maximum_retry_attempts = 0

  tags = merge({
    Api = "GET /idp/user-calendars"
  }, local.common_tags)

  environment_variables = merge({
  }, local.protected_endpoint_env_vars, local.idps_configs, local.users_persistance_env_vars)
}

module "get_idp_user_calendars_lambda_alias" {
  source  = "terraform-aws-modules/lambda/aws//modules/alias"
  version = "~> 7.17"

  function_name    = module.get_idp_user_calendars_lambda.lambda_function_name
  function_version = module.get_idp_user_calendars_lambda.lambda_function_version
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
