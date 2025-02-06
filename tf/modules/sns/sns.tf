locals {
  topic_name = "${var.topic_name}-${var.environment}${var.topic_config.fifo ? ".fifo" : ""}"
}

resource "aws_sns_topic" "topic" {
  name                        = local.topic_name
  display_name                = var.topic_display_name
  delivery_policy             = null // by default, there is a delivery policy https://docs.aws.amazon.com/sns/latest/dg/sns-message-delivery-retries.html
  fifo_topic                  = var.topic_config.fifo
  content_based_deduplication = var.topic_config.content_based_deduplication

  tags = merge({}, var.tags)
}

resource "aws_sns_topic_subscription" "topic_subscriptions" {
  for_each             = var.subscriber_arns
  topic_arn            = aws_sns_topic.topic.arn
  protocol             = "sqs"
  delivery_policy      = null // by default, there is a delivery policy https://docs.aws.amazon.com/sns/latest/dg/sns-message-delivery-retries.html
  endpoint             = each.value
  raw_message_delivery = false // by default it is false anyways. Docs: https://docs.aws.amazon.com/sns/latest/dg/sns-large-payload-raw-message-delivery.html
  redrive_policy       = null  // TODO: DLQ stuff https://docs.aws.amazon.com/sns/latest/dg/sns-dead-letter-queues.html#how-messages-moved-into-dead-letter-queue
}
