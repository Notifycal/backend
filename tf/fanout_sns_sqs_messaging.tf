module "messaging_topic" {
  source             = "./modules/sns"
  topic_name         = "messaging-${var.environment}"
  topic_display_name = "Messaging ${var.environment}"
  subscriber_arns = {
    audit_trail = module.audit_trail_queue.sqs_queue_arn
  }
  sns_feedback_iam_role_arn  = aws_iam_role.sns_feedback_role.arn
  enable_xray_active_tracing = var.enable_xray_active_tracing
  tags                       = local.common_tags
}
