module "user_calendar_fetched_topic" {
  source             = "./modules/sns"
  topic_name         = "user-calendar-fetched-${var.environment}"
  topic_display_name = "User calendar fetched ${var.environment}"
  publisher_arn      = module.fetch_user_calendars_lambda_alias.lambda_alias_arn
  subscriber_arns = {
    queue = module.user_calendar_fetched_queue.sqs_queue_arn
  }
  tags = local.common_tags
}

module "user_calendar_fetched_queue" {
  source       = "./modules/sqs"
  queue_name   = "user-calendar-fetched-${var.environment}"
  sender_arn   = module.user_calendar_fetched_topic.sns_topic_arn
  receiver_arn = "" //TODO second lambda arn
  tags         = local.common_tags
}
