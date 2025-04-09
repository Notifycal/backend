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
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:ReceiveMessage"
    ]

    resources = [
      module.fetch_user_calendars_queue.sqs_queue_arn
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
  tracing_mode          = local.lambdas_tracing_mode

  # These 2 go together, if create_async_event_config is set to false (its default),
  # lambdas will retry up to 2 times
  create_async_event_config = true
  maximum_retry_attempts    = 0
  attach_dead_letter_policy = true
  dead_letter_target_arn    = aws_sqs_queue.global_dlq_lambda.arn

  tags = local.common_tags

  attach_policy_json = true
  policy_json        = data.aws_iam_policy_document.fetch_user_calendars_iam_policydoc.json

  event_source_mapping = {
    sqs = {
      event_source_arn = module.fetch_user_calendars_queue.sqs_queue_arn
      batch_size       = 1
      scaling_config = {
        maximum_concurrency = 2
      }
      metrics_config = {
        metrics = ["EventCount"]
      }
    }
  }

  allowed_triggers = {
    AllowSQSInvoke = {
      principal  = "sqs.amazonaws.com"
      source_arn = module.fetch_user_calendars_queue.sqs_queue_arn
    }
  }

  environment_variables = merge({
    LIVE_USERS_INDEX_NAME           = local.live_users_index_name
    USER_CALENDAR_FETCHED_TOPIC_ARN = module.user_calendar_fetched_topic.sns_topic_arn
    RUN_TIME_WINDOW_PERIOD_MINUTES  = local.fetch_user_calendars_lambda_cron_schedule_window_minutes
  }, local.common_lambda_env_vars, local.users_persistance_env_vars)
}
