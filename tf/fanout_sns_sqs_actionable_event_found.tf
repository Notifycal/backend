module "actionable_event_found_topic" {
  source             = "./modules/sns"
  topic_name         = "actionable-event-found-${var.environment}"
  topic_display_name = "Actionable event found ${var.environment}"
  publisher_arn      = module.find_actionable_events_lambda_alias.lambda_alias_arn
  subscriber_arns = {
    queue = module.actionable_event_found_queue.sqs_queue_arn
  }
  tags = local.common_tags
}

module "actionable_event_found_queue" {
  source       = "./modules/sqs"
  queue_name   = "user-calendar-fetched-${var.environment}"
  sender_arn   = module.actionable_event_found_topic.sns_topic_arn
  receiver_arn = "" //TODO second lambda arn
  tags         = local.common_tags
}
