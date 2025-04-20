data "aws_ssm_parameter" "vonage_private_key" {
  # Purely used to be able to get the parameter ARN (for the policy) without interpolation
  name = var.vonage_auth_config.private_key_secret_path
}

data "aws_iam_policy_document" "send_event_reminder_iam_policydoc" {
  statement {
    effect = "Allow"

    actions = [
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:ReceiveMessage"
    ]

    resources = [
      module.actionable_event_found_queue.sqs_queue_arn,
      module.demo_reminder_to_be_sent_queue.sqs_queue_arn
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
      "ssm:GetParameter",
    ]

    resources = [
      data.aws_ssm_parameter.vonage_private_key.arn
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

locals {
  send_event_reminder_queue_sources = {
    actionable_event_found_queue   = module.actionable_event_found_queue.sqs_queue_arn,
    demo_reminder_to_be_sent_queue = module.demo_reminder_to_be_sent_queue.sqs_queue_arn
  }
  send_event_reminder_event_source_mappings = {
    for queue_name, queue_arn in local.send_event_reminder_queue_sources : queue_name => {
      event_source_arn = queue_arn
      batch_size       = 1
      scaling_config = {
        maximum_concurrency = 20
      }
      metrics_config = {
        metrics = ["EventCount"]
      }
    }
  }

  send_event_reminder_allowed_triggers = {
    for queue_name, queue_arn in local.queue_sources : "AllowSQS${title(replace(queue_name, "_", ""))}Invoke" => {
      principal  = "sqs.amazonaws.com"
      source_arn = queue_arn
    }
  }
}
module "send_event_reminder_lambda" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 7.17"

  function_name          = "send-event-reminder-${var.environment}"
  publish                = local.lambdas_publish
  create_package         = local.lambdas_create_package
  local_existing_package = "${path.root}/../dist/lambdas/sqs/send-event-reminder.zip"

  runtime     = var.lambdas_runtime
  timeout     = local.api_lambdas_timeout
  memory_size = 384
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
  policy_json        = data.aws_iam_policy_document.send_event_reminder_iam_policydoc.json

  attach_policies    = true
  policies           = local.lambdas_shared_iam_policies
  number_of_policies = length(local.lambdas_shared_iam_policies)


  event_source_mapping = local.send_event_reminder_event_source_mappings
  allowed_triggers     = local.send_event_reminder_allowed_triggers

  environment_variables = merge({
    VONAGE_APPLICATION_ID       = var.vonage_auth_config.application_id
    VONAGE_SSM_PATH_PRIVATE_KEY = data.aws_ssm_parameter.vonage_private_key.name
    VONAGE_WEBHOOK_BASE_URL     = "${local.api_url}/api/v1/webhook/reminder-status"
    MESSAGING_ENABLED           = "false"
    IDEMPOTENCY_PERSISTENCE_CONFIG = jsonencode({
      tableName            = aws_dynamodb_table.lambda_idempotency.name,
      keyAttr              = local.lambda_idempotency_table_config.hash_attribute_name,
      expiryAttr           = local.lambda_idempotency_table_config.expiration_attribute_name,
      inProgressExpiryAttr = local.lambda_idempotency_table_config.in_progress_expiry_attribute,
      statusAttr           = local.lambda_idempotency_table_config.status_attribute_name
      dataAttr             = local.lambda_idempotency_table_config.data_attribute_name
      validationKeyAttr    = local.lambda_idempotency_table_config.validation_attribute_name
    })
  }, local.messaging_topic_env_vars, local.common_lambda_env_vars)
}
