locals {
  alert_for_missing_phone_number_event_source_mappings = {
    dynamodb = {
      event_source_arn                   = aws_dynamodb_table.audit_trail_events.stream_arn
      function_name                      = module.alert_for_missing_phone_number_lambda.lambda_function_name
      starting_position                  = "LATEST"
      function_response_types            = ["ReportBatchItemFailures"]
      maximum_retry_attempts             = 3
      destination_arn_on_failure         = aws_sqs_queue.global_unprocessable.arn
      maximum_batching_window_in_seconds = 300
      batch_size                         = 100 //matches default value
      metrics_config = {
        metrics = ["EventCount"]
      }
      parallelization_factor = 1 // matches default value
      filter_criteria = [
        {
          pattern = jsonencode({
            dynamodb : {
              NewImage : {
                EventType : {
                  S : ["NoPhoneNumberForCalendarEventFound", "ActionableEventFound"]
                }
              }
            }
          })
        }
      ]
    }
  }

  alert_for_missing_phone_number_allowed_triggers = {
    dynamodb = {
      principal  = "dynamodb.amazonaws.com"
      source_arn = aws_dynamodb_table.audit_trail_events.stream_arn
    }
  }
}

data "aws_iam_policy_document" "alert_for_missing_phone_number_iam_policydoc" {
  statement {
    effect = "Allow"

    actions = [
      "dynamodb:GetRecords",
      "dynamodb:GetShardIterator",
      "dynamodb:DescribeStream",
      "dynamodb:ListStreams"
    ]

    resources = [
      aws_dynamodb_table.audit_trail_events.stream_arn
    ]
  }
  statement {
    effect = "Allow"

    actions = [
      "dynamodb:UpdateItem",
      "dynamodb:Query"
    ]

    resources = [
      aws_dynamodb_table.business_alerts.arn
    ]
  }
  statement {
    effect = "Allow"

    actions = [
      "dynamodb:Query"
    ]

    resources = [
      aws_dynamodb_table.users.arn
    ]
  }
  statement {
    effect = "Allow"

    actions = [
      "sns:Publish",
    ]

    resources = [
      module.email_to_be_sent_topic.sns_topic_arn
    ]
  }
  statement {
    effect = "Allow"

    actions = [
      "sqs:SendMessage",
    ]

    resources = [
      aws_sqs_queue.global_unprocessable.arn
    ]
  }

}

module "alert_for_missing_phone_number_lambda" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 7.17"

  function_name          = "alert-for-missing-phone-number-${var.environment}"
  publish                = local.lambdas_publish
  create_package         = local.lambdas_create_package
  local_existing_package = "${path.root}/../dist/lambdas/dynamodb-streams/alert-for-missing-phone-number.zip"

  runtime     = var.lambdas_runtime
  timeout     = local.api_lambdas_timeout
  memory_size = 256
  handler     = var.lambdas_handler_name

  layers = local.lambdas_layers

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
  policy_json        = data.aws_iam_policy_document.alert_for_missing_phone_number_iam_policydoc.json

  attach_policies    = true
  policies           = local.lambdas_shared_iam_policies
  number_of_policies = length(local.lambdas_shared_iam_policies)

  event_source_mapping = local.alert_for_missing_phone_number_event_source_mappings
  allowed_triggers     = local.alert_for_missing_phone_number_allowed_triggers

  environment_variables = merge({
    ERROR_RATE_THRESHOLD              = var.alert_for_missing_phone_number.error_rate_threshold
    MAX_NOTIFICATIONS_PER_DAY         = var.alert_for_missing_phone_number.max_notifications_per_day
    COUNT_THRESHOLD_TO_ENABLE_TRIGGER = var.alert_for_missing_phone_number.count_threshold_to_enable_trigger
    EMAILING_SENDER_DISPLAY_NAME      = var.emailing_config.sender.displayName
    EMAILING_SENDER_EMAIL             = var.emailing_config.sender.email
  }, local.email_to_be_sent_topic_env_vars, local.users_persistance_env_vars, local.business_alerts_persistance_env_vars, local.common_lambda_env_vars)
}
