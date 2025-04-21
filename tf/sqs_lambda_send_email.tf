data "aws_iam_policy_document" "send_email_iam_policydoc" {
  statement {
    effect = "Allow"

    actions = [
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:ReceiveMessage"
    ]

    resources = [
      module.actionable_event_found_queue.sqs_queue_arn
    ]
  }
  statement {
    effect = "Allow"

    actions = [
      "dynamodb:PutItem",
      "dynamodb:GetItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
    ]

    resources = [
      aws_dynamodb_table.lambda_idempotency.arn
    ]
  }

  statement {
    effect = "Allow"

    actions = [
      "sns:Publish",
    ]

    resources = [
      module.messaging_topic.sns_topic_arn
    ]
  }
}

module "send_email_lambda" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 7.17"

  function_name          = "send-email-${var.environment}"
  publish                = local.lambdas_publish
  create_package         = local.lambdas_create_package
  local_existing_package = "${path.root}/../dist/lambdas/sqs/send-email.zip"

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
  policy_json        = data.aws_iam_policy_document.send_email_iam_policydoc.json

  attach_policies    = true
  policies           = local.lambdas_shared_iam_policies
  number_of_policies = length(local.lambdas_shared_iam_policies)

  event_source_mapping = {
    sqs = {
      event_source_arn = module.actionable_event_found_queue.sqs_queue_arn
      batch_size       = 1
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
      source_arn = module.actionable_event_found_queue.sqs_queue_arn
    }
  }

  environment_variables = merge({
    EMAILING_ENABLED = var.emailing_config.enabled

    MAILGUN_API_KEY              = var.mailgun_auth.api_key
    MAILGUN_BASE_URL             = var.mailgun_config.base_url
    MAILGUN_DOMAIN_NAME          = var.mailgun_config.domain_name
    EMAILING_SENDER_DISPLAY_NAME = var.emailing_config.sender.displayName
    EMAILING_SENDER_EMAIL        = var.emailing_config.sender.email
  }, local.messaging_topic_env_vars, local.idempotency_persistance_env_vars, local.common_lambda_env_vars)
}
