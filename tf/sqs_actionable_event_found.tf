module "actionable_event_found_queue" {
  source       = "./modules/sqs"
  queue_name   = "user-calendar-fetched-${var.environment}"
  sender_arn   = module.actionable_event_found_topic.sns_topic_arn
  receiver_arn = "" //TODO second lambda arn
  tags         = local.common_tags
}
