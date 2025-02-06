module "user_calendar_fetched_queue" {
  source       = "./modules/sqs"
  queue_name   = "user-calendar-fetched-${var.environment}"
  sender_arn   = module.user_calendar_fetched_topic.sns_topic_arn
  receiver_arn = "" //TODO second lambda arn
  tags         = local.common_tags
}
