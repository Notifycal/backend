data "aws_iam_policy_document" "find_actionable_events_iam_policydoc" {
  statement {
    effect = "Allow"

    actions = [
      "sns:Publish",
    ]

    resources = [
      module.actionable_event_found_topic.sns_topic_arn
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
      module.user_calendar_fetched_queue.sqs_queue_arn
    ]
  }
}

module "find_actionable_events_lambda" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 7.17"

  function_name          = "find-actionable-events-${var.environment}"
  publish                = local.lambdas_publish
  create_package         = local.lambdas_create_package
  local_existing_package = "${path.root}/../dist/lambdas/sqs/find-actionable-events.zip"

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

  tags = local.common_tags

  attach_policy_json = true
  policy_json        = data.aws_iam_policy_document.find_actionable_events_iam_policydoc.json

  event_source_mapping = {
    sqs = {
      event_source_arn = module.user_calendar_fetched_queue.sqs_queue_arn
      scaling_config = {
        maximum_concurrency = 20
      }
      metrics_config = {
        metrics = ["EventCount"]
      }

      # TODO: RESEARCH
      # function_response_types = ["ReportBatchItemFailures"]
    }
  }

  allowed_triggers = {
    AllowSQSInvoke = {
      principal  = "sqs.amazonaws.com"
      source_arn = module.user_calendar_fetched_queue.sqs_queue_arn
    }
  }

  environment_variables = merge({
    ACTIONABLE_EVENTS_FOUND_TOPIC_ARN = module.actionable_event_found_topic.sns_topic_arn
  }, local.common_lambda_env_vars)
}
