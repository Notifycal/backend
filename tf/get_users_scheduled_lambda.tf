locals {
  get_users_lambda_minutes_frequency = 5
}

resource "aws_cloudwatch_event_rule" "get_users_trigger_rule" {
  name        = "get_users_lambda_schedule"
  description = "Schedule for get_users Lambda"

  schedule_expression = "cron(0/${local.get_users_lambda_minutes_frequency} * * * ? *)"
}

resource "aws_cloudwatch_event_target" "get_users_event_target" {
  rule      = aws_cloudwatch_event_rule.get_users_trigger_rule.name
  target_id = "SendToLambda"
  arn       = module.get_users_scheduled_lambda.lambda_function_arn
}

module "get_users_scheduled_lambda" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 7.2"

  function_name          = "get-users-scheduled-${var.resource_suffix}"
  publish                = true
  create_package         = false
  local_existing_package = "${path.root}/../dist/get-users-scheduled.zip"

  runtime     = "nodejs20.x"
  timeout     = 30
  memory_size = 128
  handler     = "index.handler"

  logging_log_format = "JSON"

  allowed_triggers = {
    AllowEventBridgeInvoke = {
      principal = "events.amazonaws.com"
      source_arn = aws_cloudwatch_event_rule.get_users_trigger_rule.arn
    }
  }

  attach_policy_statements = true
  policy_statements = {
    sqs_get_users = {
      effect    = "Allow",
      actions   = ["sqs:SendMessage"],
      resources = [aws_sqs_queue.get_users.arn]
    }
  }

  environment_variables = merge({
    GET_USERS_SQS_QUEUE = aws_sqs_queue.get_users.id
  }, local.common_lambda_env_vars)
}
