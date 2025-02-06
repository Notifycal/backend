# Fetch user calendars or just fetch calendars? Isn't that implementation details?

locals {
  fetch_user_calendars_lambda_cron_schedule      = "cron(0/5 * * * ? *)"
  fetch_user_calendars_lambda_function_name      = "fetch-user-calendars"
  fetch_user_calendars_lambda_function_full_name = "${local.fetch_user_calendars_lambda_function_name}-${var.environment}"
}

data "aws_iam_policy_document" "fetch_user_calendars_iam_policydoc" {
  statement {
    effect = "Allow"

    actions = [
      "dynamodb:Query",
    ]

    resources = [
      aws_dynamodb_table.users.arn,
      "${aws_dynamodb_table.users.arn}/index/${local.live_users_index_name}"
    ]
  }

  statement {
    effect = "Allow"

    actions = [
      "sns:Publish",
    ]

    resources = [
      module.user_calendar_fetched_topic.sns_topic_arn
    ]
  }
}

resource "aws_cloudwatch_event_rule" "fetch_user_calendars_trigger_rule" {
  name        = "${local.fetch_user_calendars_lambda_function_name}-schedule-${var.environment}"
  description = "Schedule for fetch_user_calendars Lambda"

  schedule_expression = local.fetch_user_calendars_lambda_cron_schedule
}

resource "aws_cloudwatch_event_target" "fetch_user_calendars_event_target" {
  rule      = aws_cloudwatch_event_rule.fetch_user_calendars_trigger_rule.name
  target_id = "FetchLiveUsersCalendars"
  arn       = module.fetch_user_calendars_lambda_alias.lambda_alias_arn
}

module "fetch_user_calendars_lambda" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 7.17"

  function_name          = "fetch-user-calendars-${var.environment}"
  publish                = local.lambdas_publish
  create_package         = local.lambdas_create_package
  local_existing_package = "${path.root}/../dist/lambdas/schedule/fetch-user-calendars.zip"

  runtime     = var.lambdas_runtime
  timeout     = local.api_lambdas_timeout
  memory_size = 256
  handler     = var.lambdas_handler_name

  logging_log_format    = var.lambdas_logging_log_format
  attach_tracing_policy = local.lambdas_attach_tracing_policy
  tracing_mode          = var.lambdas_tracing_mode

  maximum_retry_attempts = 0

  tags = local.common_tags

  attach_policy_json = true
  policy_json        = data.aws_iam_policy_document.fetch_user_calendars_iam_policydoc.json

  environment_variables = merge({
    LIVE_USERS_INDEX_NAME     = local.live_users_index_name
    FETCH_CALENDARS_TOPIC_ARN = "TODO"
  }, local.protected_endpoint_env_vars, local.users_persistance_env_vars)
}

module "fetch_user_calendars_lambda_alias" {
  source  = "terraform-aws-modules/lambda/aws//modules/alias"
  version = "~> 7.17"

  function_name    = module.fetch_user_calendars_lambda.lambda_function_name
  function_version = module.fetch_user_calendars_lambda.lambda_function_version
  name             = var.lambdas_live_alias_name

  allowed_triggers = {
    AllowEventBridgeInvoke = {
      principal  = "events.amazonaws.com"
      source_arn = aws_cloudwatch_event_rule.fetch_user_calendars_trigger_rule.arn
    }
  }
}
