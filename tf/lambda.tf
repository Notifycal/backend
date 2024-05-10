module "post_watch_lambda" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 7.2"

  function_name          = "post-watch-events-${var.environment}"
  publish                = true
  create_package         = false
  local_existing_package = "${path.root}/../dist/api/post-watch-events.zip"

  runtime     = "nodejs20.x"
  timeout     = 30
  memory_size = 128
  handler     = "index.handler"

  logging_log_format    = "JSON"
  attach_tracing_policy = true
  tracing_mode          = "Active"

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

  environment_variables = merge({}, local.common_lambda_env_vars)
}
