module "actionable_event_found_topic" {
  source             = "./modules/sns"
  topic_name         = "actionable-event-found-${var.environment}"
  topic_display_name = "Actionable event found ${var.environment}"
  publisher_arn      = module.find_actionable_events_lambda.lambda_function_arn
  subscriber_arns = {
    queue = module.actionable_event_found_queue.sqs_queue_arn
    audit_trail = module.audit_trail_queue.sqs_queue_arn
  }
  sns_feedback_iam_role_arn  = aws_iam_role.sns_feedback_role.arn
  enable_xray_active_tracing = var.enable_xray_active_tracing
  tags                       = local.common_tags
}

module "actionable_event_found_queue" {
  source       = "./modules/sqs"
  queue_name   = "actionable-event-found-${var.environment}"
  sender_arns   = toset([module.actionable_event_found_topic.sns_topic_arn])
  receiver_arn = "" //TODO third lambda arn
  tags         = local.common_tags

  redrive_policy = {
    max_receive_count      = 2
    dead_letter_target_arn = aws_sqs_queue.global_dlq_sqs.arn
  }
}
