locals {
  topic_name = "${var.topic_name}${var.topic_config.fifo ? ".fifo" : ""}"
}

resource "aws_sns_topic" "topic" {
  name                        = local.topic_name
  display_name                = var.topic_display_name
  delivery_policy             = null // by default, there is a delivery policy https://docs.aws.amazon.com/sns/latest/dg/sns-message-delivery-retries.html
  fifo_topic                  = var.topic_config.fifo
  content_based_deduplication = var.topic_config.content_based_deduplication

  tracing_config = var.enable_xray_active_tracing ? "Active" : "PassThrough"

  sqs_failure_feedback_role_arn    = var.sns_feedback_iam_role_arn
  sqs_success_feedback_role_arn    = var.sns_feedback_iam_role_arn
  sqs_success_feedback_sample_rate = 100

  tags = merge({}, var.tags)
}

resource "aws_sns_topic_subscription" "topic_subscriptions" {
  for_each             = var.subscribers
  topic_arn            = aws_sns_topic.topic.arn
  filter_policy        = each.value.filter_policy
  filter_policy_scope  = each.value.filter_policy != null ? each.value.filter_policy_scope : null
  protocol             = "sqs"
  delivery_policy      = null // by default, there is a delivery policy https://docs.aws.amazon.com/sns/latest/dg/sns-message-delivery-retries.html
  endpoint             = each.value.arn
  raw_message_delivery = true // by default it is false. If you want that be ready to desencapsulate the message several times.
  redrive_policy       = null // TODO: DLQ stuff https://docs.aws.amazon.com/sns/latest/dg/sns-dead-letter-queues.html#how-messages-moved-into-dead-letter-queue
}
