locals {
  queue_sources = {
    audit_trail_queue = module.audit_trail_queue.sqs_queue_arn,
    global_dlq_lambda = aws_sqs_queue.global_dlq_lambda.arn,
    global_dlq_sqs    = aws_sqs_queue.global_dlq_sqs.arn
  }

  event_source_mappings = {
    for queue_name, queue_arn in local.queue_sources : queue_name => {
      event_source_arn = queue_arn
      scaling_config   = { maximum_concurrency = 20 }
      metrics_config   = { metrics = ["EventCount"] }
      # TODO: RESEARCH
      # function_response_types = ["ReportBatchItemFailures"]
    }
  }

  allowed_triggers = {
    for queue_name, queue_arn in local.queue_sources : "Allow${title(replace(queue_name, "_", ""))}Invoke" => {
      principal  = "sqs.amazonaws.com"
      source_arn = queue_arn
    }
  }
}

data "aws_iam_policy_document" "audit_trail_iam_policydoc" {
  statement {
    effect = "Allow"

    actions = [
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:ReceiveMessage"
    ]

    resources = values(local.queue_sources)
  }
}

module "audit_trail_lambda" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 7.17"

  function_name          = "audit-trail-${var.environment}"
  publish                = local.lambdas_publish
  create_package         = local.lambdas_create_package
  local_existing_package = "${path.root}/../dist/lambdas/sqs/audit-trail.zip"

  runtime     = var.lambdas_runtime
  timeout     = local.api_lambdas_timeout
  memory_size = 256
  handler     = var.lambdas_handler_name

  logging_log_format    = var.lambdas_logging_log_format
  attach_tracing_policy = local.lambdas_attach_tracing_policy
  tracing_mode          = local.lambdas_tracing_mode

  create_async_event_config = true
  maximum_retry_attempts    = 0
  attach_dead_letter_policy = true
  dead_letter_target_arn    = aws_sqs_queue.global_dlq_unprocessable_lambda.arn 

  tags = local.common_tags

  attach_policy_json = true
  policy_json        = data.aws_iam_policy_document.audit_trail_iam_policydoc.json

  event_source_mapping = local.event_source_mappings
  allowed_triggers     = local.allowed_triggers

  environment_variables = merge({
    AUDIT_TRAIL_TABLE_NAME = aws_dynamodb_table.audit_trail_events.name
  }, local.common_lambda_env_vars)
}
