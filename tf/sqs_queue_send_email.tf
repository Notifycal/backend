module "send_email_queue" {
  source       = "./modules/sqs"
  queue_name   = "send-email-${var.environment}"
  sender_arns  = toset([])
  receiver_arn = module.send_email_lambda.lambda_function_arn
  tags         = local.common_tags

  redrive_policy = {
    max_receive_count      = 2
    dead_letter_target_arn = aws_sqs_queue.global_dlq_sqs.arn
  }
}
