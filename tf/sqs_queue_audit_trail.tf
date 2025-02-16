module "audit_trail_queue" {
  source     = "./modules/sqs"
  queue_name = "audit-trail-${var.environment}"
  sender_arns = toset([
    module.user_calendar_fetched_topic.sns_topic_arn,
    module.actionable_event_found_topic.sns_topic_arn
  ])
  receiver_arn = module.audit_trail_lambda.lambda_function_arn
  tags         = local.common_tags
}
