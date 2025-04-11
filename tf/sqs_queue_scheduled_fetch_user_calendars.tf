locals {
  fetch_user_calendars_lambda_cron_schedule_window_minutes = "30"
  fetch_user_calendars_lambda_cron_schedule                = "cron(0/${local.fetch_user_calendars_lambda_cron_schedule_window_minutes} * * * ? *)"
  fetch_user_calendars_lambda_function_name                = "fetch-user-calendars"
}

resource "aws_cloudwatch_event_rule" "fetch_user_calendars_trigger_rule" {
  name        = "${local.fetch_user_calendars_lambda_function_name}-schedule-${var.environment}"
  description = "Schedule for fetch_user_calendars queue"

  schedule_expression = local.fetch_user_calendars_lambda_cron_schedule
}

resource "aws_cloudwatch_event_target" "fetch_user_calendars_event_target" {
  rule      = aws_cloudwatch_event_rule.fetch_user_calendars_trigger_rule.name
  target_id = "FetchLiveUsersCalendars"
  arn       = module.fetch_user_calendars_queue.sqs_queue_arn
  sqs_target {
    message_group_id = "event-bridge"
  }
}

module "fetch_user_calendars_queue" {
  source     = "./modules/sqs"
  queue_name = "fetch-user-calendars-${var.environment}"
  sender_arns = toset([
    aws_cloudwatch_event_rule.fetch_user_calendars_trigger_rule.arn
  ])
  receiver_arn = module.fetch_user_calendars_lambda.lambda_function_arn
  tags         = local.common_tags

  redrive_policy = {
    max_receive_count      = 2
    dead_letter_target_arn = aws_sqs_queue.global_dlq_sqs.arn
  }
}
