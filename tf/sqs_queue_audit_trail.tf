module "audit_trail_queue" {
  source       = "./modules/sqs"
  queue_name   = "audit-trail-${var.environment}"
  sender_arns  = toset(local.all_sns_topics)
  receiver_arn = module.audit_trail_lambda.lambda_function_arn
  tags         = local.common_tags

  redrive_policy = {
    max_receive_count      = 2
    dead_letter_target_arn = aws_sqs_queue.global_dlq_unprocessable_sqs.arn
  }
}
