resource "aws_sqs_queue" "global_dlq" {
  name = "global-dlq-${var.environment}.fifo"

  fifo_queue = true
}

