data "aws_iam_policy_document" "stripe_webhook_iam_policydoc" {
  statement {
    effect = "Allow"

    actions = [
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:ReceiveMessage"
    ]

    resources = [
      module.stripe_webhook_queue.sqs_queue_arn
    ]
  }
  statement {
    effect = "Allow"

    actions = [
      "dynamodb:UpdateItem"
    ]

    resources = [
      aws_dynamodb_table.users.arn
    ]
  }
  statement {
    effect = "Allow"

    actions = [
      "dynamodb:Query",
    ]

    resources = [
      aws_dynamodb_table.users.arn,
      "${aws_dynamodb_table.users.arn}/index/${local.payment_users_index_name}"
    ]
  }
  statement {
    effect = "Allow"

    actions = [
      "sns:Publish",
    ]

    resources = [
      module.payment_webhook_topic.sns_topic_arn
    ]
  }
}

module "stripe_webhook_lambda" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 8.0"

  function_name          = "stripe-webhook-${var.environment}"
  publish                = local.lambdas_publish
  create_package         = local.lambdas_create_package
  local_existing_package = "${path.root}/../dist/lambdas/sqs/stripe-webhook.zip"

  runtime     = var.lambdas_runtime
  timeout     = local.api_lambdas_timeout
  memory_size = 512
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
  policy_json        = data.aws_iam_policy_document.stripe_webhook_iam_policydoc.json

  attach_policies    = true
  policies           = local.lambdas_shared_iam_policies
  number_of_policies = length(local.lambdas_shared_iam_policies)

  event_source_mapping = {
    sqs = {
      event_source_arn        = module.stripe_webhook_queue.sqs_queue_arn
      function_response_types = ["ReportBatchItemFailures"]
      scaling_config = {
        maximum_concurrency = 20
      }
      metrics_config = {
        metrics = ["EventCount"]
      }
    }
  }

  allowed_triggers = {
    AllowSQSInvoke = {
      principal  = "sqs.amazonaws.com"
      source_arn = module.stripe_webhook_queue.sqs_queue_arn
    }
  }

  environment_variables = merge({
    PAYMENT_WEBHOOK_TOPIC_ARN = module.payment_webhook_topic.sns_topic_arn
  }, local.payment_plans_env_vars, local.common_lambda_env_vars, local.users_persistance_env_vars, local.payment_users_index_persistance_env_vars)
}
