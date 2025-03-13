data "aws_iam_policy_document" "event_reminder_status_change_webhook_iam_policydoc" {
  statement {
    effect = "Allow"

    actions = [
      "sqs:SendMessage",
    ]

    resources = [
      module.audit_trail_queue.sqs_queue_arn
    ]
  }
}

module "event_reminder_status_change_webhook_lambda" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 7.17"

  function_name          = "post-event-reminder-delivery-status-webhook-${var.environment}"
  publish                = local.lambdas_publish
  create_package         = local.lambdas_create_package
  local_existing_package = "${path.root}/../dist/lambdas/api/post-event-reminder-delivery-status-webhook.zip"

  runtime     = var.lambdas_runtime
  timeout     = local.api_lambdas_timeout
  memory_size = 256
  handler     = var.lambdas_handler_name

  logging_log_format    = var.lambdas_logging_log_format
  attach_tracing_policy = local.lambdas_attach_tracing_policy
  tracing_mode          = local.lambdas_tracing_mode

  maximum_retry_attempts = 0

  tags = merge({
    Api = "POST /webhook/reminder-status"
  }, local.common_tags)

  attach_policy_json = true
  policy_json        = data.aws_iam_policy_document.event_reminder_status_change_webhook_iam_policydoc.json

  environment_variables = merge({
    AUDIT_TRAIL_QUEUE_URL = module.audit_trail_queue.sqs_queue_url
  }, local.common_lambda_env_vars)
}

module "event_reminder_status_change_webhook_lambda_alias" {
  source  = "terraform-aws-modules/lambda/aws//modules/alias"
  version = "~> 7.17"

  function_name    = module.event_reminder_status_change_webhook_lambda.lambda_function_name
  function_version = module.event_reminder_status_change_webhook_lambda.lambda_function_version
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
