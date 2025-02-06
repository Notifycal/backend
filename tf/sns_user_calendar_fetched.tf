module "user_calendar_fetched_topic" {
  source             = "./modules/sns"
  environment        = var.environment
  topic_name         = "user-calendar-fetched"
  topic_display_name = "User calendar fetched"
  publisher_arn      = module.fetch_user_calendars_lambda_alias.lambda_alias_arn
  subscriber_arns = {
    queue = module.user_calendar_fetched_queue.sqs_queue_arn
  }
  tags = local.common_tags
}
