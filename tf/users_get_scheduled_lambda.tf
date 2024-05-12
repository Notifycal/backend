locals {
  get_users_lambda_minutes_frequency  = 5
  get_users_lambda_function_name      = "get-users-scheduled"
  get_users_lambda_function_full_name = "${local.get_users_lambda_function_name}-${var.environment}"
}

resource "aws_cloudwatch_event_rule" "get_users_trigger_rule" {
  name        = "get_users_lambda_schedule"
  description = "Schedule for get_users Lambda"

  schedule_expression = "cron(0/${local.get_users_lambda_minutes_frequency} * * * ? *)"
}

resource "aws_cloudwatch_event_target" "get_users_event_target" {
  rule      = aws_cloudwatch_event_rule.get_users_trigger_rule.name
  target_id = "GetUsers" # TODO: rename this
  arn       = module.get_users_scheduled_lambda.lambda_function_arn
}

module "get_users_scheduled_lambda" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 7.2"

  function_name          = local.get_users_lambda_function_full_name
  publish                = true
  create_package         = false
  local_existing_package = "${path.root}/../dist/get-users-scheduled.zip"

  runtime     = "nodejs20.x"
  timeout     = 30
  memory_size = 128
  handler     = "index.handler"

  logging_log_format    = "JSON"
  attach_tracing_policy = true
  tracing_mode          = "Active"

  maximum_retry_attempts = 0

  allowed_triggers = {
    AllowEventBridgeInvoke = {
      principal  = "events.amazonaws.com"
      source_arn = aws_cloudwatch_event_rule.get_users_trigger_rule.arn
    }
  }

  attach_policy_statements = true
  policy_statements = {
    sqs_users = {
      effect    = "Allow",
      actions   = ["sqs:SendMessage"],
      resources = [aws_sqs_queue.users.arn]
    }
    dynamo_users_table = {
      effect = "Allow",
      actions = [
        "dynamodb:DescribeTable",
        "dynamodb:Query",
        "dynamodb:Scan"
      ]
      resources = [aws_dynamodb_table.users.arn]
    }
  }

  environment_variables = merge({
    USERS_SQS_QUEUE_URL          = aws_sqs_queue.users.id
    USERS_DYNAMO_TABLE           = aws_dynamodb_table.users.id
    POWERTOOLS_SERVICE_NAME      = local.get_users_lambda_function_name
    POWERTOOLS_METRICS_NAMESPACE = "core"
  }, local.common_lambda_env_vars)
}
