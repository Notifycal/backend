locals {
  fetch_user_calendars_lambda_cron_schedule      = "cron(0/5 * * * ? *)"
  fetch_user_calendars_lambda_function_name      = "get-users-scheduled"
  fetch_user_calendars_lambda_function_full_name = "${local.fetch_user_calendars_lambda_function_name}-${var.environment}"
}

data "aws_iam_policy_document" "fetch_user_calendars_iam_policydoc" {
  statement {
    effect = "Allow"

    actions = [
      "dynamodb:GetItem", # TODO: change/add to list/query/scan
    ]

    resources = [
      aws_dynamodb_table.users.arn
    ]
  }
  statement {
    effect = "Allow"

    actions = [
      "sqs:SendMessage", # TODO: change to list/query/scan
    ]

    resources = [
      aws_sqs_queue.calendars.arn
    ]
  }
}

# TODO: Add schedule call

resource "aws_cloudwatch_event_rule" "fetch_user_calendars_trigger_rule" {
  name        = "fetch_user_calendars_lambda_schedule"
  description = "Schedule for fetch_user_calendars Lambda"

  schedule_expression = local.fetch_user_calendars_lambda_cron_schedule
}

resource "aws_cloudwatch_event_target" "fetch_user_calendars_event_target" {
  rule      = aws_cloudwatch_event_rule.fetch_user_calendars_trigger_rule.name
  target_id = "GetUsers" # TODO: rename this
  arn       = module.fetch_user_calendars_lambda.lambda_function_arn
}

module "fetch_user_calendars_lambda" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 7.17"

  function_name          = "fetch-user-calendars-${var.environment}"
  publish                = local.lambdas_publish
  create_package         = local.lambdas_create_package
  local_existing_package = "${path.root}/../dist/lambdas/api/fetch-user-calendars.zip"

  runtime     = var.lambdas_runtime
  timeout     = local.api_lambdas_timeout
  memory_size = 256
  handler     = var.lambdas_handler_name

  logging_log_format    = var.lambdas_logging_log_format
  attach_tracing_policy = local.lambdas_attach_tracing_policy
  tracing_mode          = var.lambdas_tracing_mode

  maximum_retry_attempts = 0

  tags = merge({
    Background = "fetch-users-calendars"
  }, local.common_tags)

  attach_policy_json = true
  policy_json        = data.aws_iam_policy_document.fetch_user_calendars_iam_policydoc.json

  environment_variables = merge({
    USERS_TABLE_NAME        = aws_dynamodb_table.users.name
    CALENDAR_SQS_QUEUE_URL  = aws_sqs_queue.calendars.id
    ACCESS_JWT_PUBLIC_KEY   = data.aws_ssm_parameter.access_jwt_public_key.value
  }, local.protected_endpoint_env_vars)
}

module "fetch_user_calendars_lambda_alias" {
  source  = "terraform-aws-modules/lambda/aws//modules/alias"
  version = "~> 7.17"

  function_name    = module.fetch_user_calendars_lambda.lambda_function_name
  function_version = module.fetch_user_calendars_lambda.lambda_function_version
  name             = var.lambdas_live_alias_name

  allowed_triggers = {
    AllowEventBridgeInvoke = {
      principal = "events.amazonaws.com"
      source_arn = aws_cloudwatch_event_rule.fetch_user_calendars_trigger_rule.arn
    }
  }
}
