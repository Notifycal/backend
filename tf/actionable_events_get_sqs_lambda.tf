locals {
  get_actionable_events_lambda_function_name      = "get-actionable-events-sqs"
  get_actionable_events_lambda_function_full_name = "${local.get_actionable_events_lambda_function_name}-${var.environment}"
}

resource "aws_lambda_event_source_mapping" "get_actionable_events_sqs_trigger" {
  enabled          = true
  batch_size       = 1
  event_source_arn = aws_sqs_queue.users.arn
  function_name    = module.get_actionable_events_sqs_lambda.lambda_function_arn
}

module "get_actionable_events_sqs_lambda" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 7.2"

  function_name          = local.get_actionable_events_lambda_function_full_name
  publish                = true
  create_package         = false
  local_existing_package = "${path.root}/../dist/get-actionable-events-sqs.zip"

  runtime     = "nodejs20.x"
  timeout     = 30
  memory_size = 128
  handler     = "index.handler"

  logging_log_format    = "JSON"
  attach_tracing_policy = true
  tracing_mode          = "Active"

  maximum_retry_attempts = 0

  # allowed_triggers = {
  #   AllowEventBridgeInvoke = {
  #     principal  = "events.amazonaws.com"
  #     source_arn = aws_cloudwatch_event_rule.get_users_trigger_rule.arn
  #   }
  # }

  attach_policy_statements = true
  policy_statements = {
    sqs_process_user = {
      effect    = "Allow",
      actions   = [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "sqs:DeleteMessage"
      ]
      resources = [aws_sqs_queue.users.arn]
    }
  }

  environment_variables = merge({
    # USERS_SQS_QUEUE_URL          = aws_sqs_queue.users.id
    # USERS_DYNAMO_TABLE           = aws_dynamodb_table.users.id
    POWERTOOLS_SERVICE_NAME      = local.get_actionable_events_lambda_function_name
    POWERTOOLS_METRICS_NAMESPACE = "core"
  }, local.common_lambda_env_vars)
}
