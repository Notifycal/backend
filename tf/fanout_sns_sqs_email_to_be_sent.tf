module "email_to_be_sent_topic" {
  source             = "./modules/sns"
  topic_name         = "email-to-be-sent-${var.environment}"
  topic_display_name = "Email to be sent ${var.environment}"
  subscribers = {
    queue = {
      arn = module.email_to_be_sent_queue.sqs_queue_arn
    }
    audit_trail = local.audit_trail_subscription
  }
  sns_feedback_iam_role_arn  = aws_iam_role.sns_feedback_role.arn
  enable_xray_active_tracing = var.enable_xray_active_tracing
  tags                       = local.common_tags
}

module "email_to_be_sent_queue" {
  source       = "./modules/sqs"
  queue_name   = "email-to-be-sent-${var.environment}"
  sender_arns  = toset([module.email_to_be_sent_topic.sns_topic_arn])
  receiver_arn = "" //TODO third lambda arn
  tags         = local.common_tags

  redrive_policy = {
    max_receive_count      = 2
    dead_letter_target_arn = aws_sqs_queue.global_dlq_sqs.arn
  }
}
