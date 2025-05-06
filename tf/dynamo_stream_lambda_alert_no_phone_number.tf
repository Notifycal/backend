locals {
  event_source_mappings = {
    dynamodb = {
      event_source_arn  = aws_dynamodb_table.audit_trail_events.stream_arn
      starting_position = "LATEST"
      filter_criteria = {
        filter = {
          pattern = jsonencode({
            dynamodb = {
              NewImage = {
                EventType = {
                  S = ["NoPhoneNumberForCalendarEventFound", "ActionableEventFound"]
                }
              }
            }
          })
        }
      }
    }
  }

  allowed_triggers = {
    dynamodb = {
      principal  = "dynamodb.amazonaws.com"
      source_arn = aws_dynamodb_table.audit_trail_events.stream_arn
    }
  }
}

data "aws_iam_policy_document" "alert_no_phone_number_iam_policydoc" {
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
    ]

    resources = [
      aws_dynamodb_table.alert_no_phone_number.arn
    ]
  }
}

module "alert_no_phone_number_lambda" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 7.17"

  function_name          = "alert-no-phone-number-${var.environment}"
  publish                = local.lambdas_publish
  create_package         = local.lambdas_create_package
  local_existing_package = "${path.root}/../dist/lambdas/dynamodb-streams/alert-no-phone-number.zip"

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
  policy_json        = data.aws_iam_policy_document.alert_no_phone_number_iam_policydoc.json

  attach_policies    = true
  policies           = local.lambdas_shared_iam_policies
  number_of_policies = length(local.lambdas_shared_iam_policies)

  event_source_mapping = local.event_source_mappings
  allowed_triggers     = local.allowed_triggers

  environment_variables = merge({
    ALERT_NO_PHONE_NUMBER_TABLE_NAME = aws_dynamodb_table.alert_no_phone_number.name
  }, local.email_to_be_sent_topic_env_vars, local.common_lambda_env_vars)
}


resource "aws_lambda_event_source_mapping" "dynamodb_stream_mapping" {
  event_source_arn  = aws_dynamodb_table.audit_trail_events.stream_arn
  function_name     = module.alert_no_phone_number_lambda.lambda_function_name
  starting_position = "LATEST"
  filter_criteria {
    filter {
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
  }
}
