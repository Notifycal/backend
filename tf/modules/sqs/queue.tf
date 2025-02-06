locals {
  queue_name = "${var.queue_name}${var.queue_config.fifo ? ".fifo" : ""}"
}
resource "aws_sqs_queue" "queue" {
  name                        = local.queue_name
  content_based_deduplication = var.queue_config.fifo
  fifo_queue                  = var.queue_config.content_based_deduplication
  message_retention_seconds   = null // default value, 4 days
  receive_wait_time_seconds   = null // default 0 seconds
  visibility_timeout_seconds  = null // default 30 seconds Docs: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html

  tags = var.tags
}

data "aws_iam_policy_document" "queue_policy" {
  statement {
    sid = "${local.queue_name}-sender-policy"
    actions = [
      "sqs:SendMessage"
    ]

    resources = [
      aws_sqs_queue.queue.arn
    ]

    principals {
      type = "AWS"
      identifiers = ["*"]
    }

    condition {
      test = "ArnLike"
      variable = "aws:SourceArn"
      values = [var.sender_arn]
    }
  }

  statement {
    sid = "${local.queue_name}-receiver-policy"
    actions = [
      "sqs:ReceiveMessage"
    ]

    resources = [
      aws_sqs_queue.queue.arn
    ]

    principals {
      type = "AWS"
      identifiers = ["*"]
    }

    condition {
      test = "ArnLike"
      variable = "aws:SourceArn"
      values = [var.receiver_arn]
    }
  }
}

resource "aws_sqs_queue_policy" "queue_policy" {
  queue_url = aws_sqs_queue.queue.url
  policy    = data.aws_iam_policy_document.queue_policy.json
}
