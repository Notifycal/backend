module "user_calendar_fetched_topic" {
  source             = "./modules/sns"
  topic_name         = "user-calendar-fetched-${var.environment}"
  topic_display_name = "User calendar fetched ${var.environment}"
  publisher_arn      = module.fetch_user_calendars_lambda.lambda_function_arn
  subscriber_arns = {
    queue       = module.user_calendar_fetched_queue.sqs_queue_arn
    audit_trail = module.audit_trail_queue.sqs_queue_arn
  }
  sns_feedback_iam_role_arn  = aws_iam_role.sns_feedback_role.arn
  enable_xray_active_tracing = var.enable_xray_active_tracing
  tags                       = local.common_tags
}

module "user_calendar_fetched_queue" {
  source       = "./modules/sqs"
  queue_name   = "user-calendar-fetched-${var.environment}"
  sender_arns  = toset([module.user_calendar_fetched_topic.sns_topic_arn])
  receiver_arn = module.find_actionable_events_lambda.lambda_function_arn
  tags         = local.common_tags

  redrive_policy = {
    max_receive_count      = 2
    dead_letter_target_arn = aws_sqs_queue.global_dlq_sqs.arn
  }
}
