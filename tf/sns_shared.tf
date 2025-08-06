locals {
  all_sns_topics = [
    module.user_calendar_fetched_topic.sns_topic_arn,
    module.actionable_event_found_topic.sns_topic_arn,
    module.demo_reminder_to_be_sent_topic.sns_topic_arn,
    module.messaging_topic.sns_topic_arn,
    module.emailing_topic.sns_topic_arn,
    module.api_rest_topic.sns_topic_arn,
    module.payment_webhook_topic.sns_topic_arn
  ]
}
