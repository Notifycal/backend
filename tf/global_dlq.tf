resource "aws_sqs_queue" "global_dlq" {
  name = "global-dlq-${var.environment}.fifo"

  fifo_queue = true
}

resource "aws_sqs_queue_redrive_allow_policy" "dlq_redrive_allow_policy" {
  queue_url = aws_sqs_queue.global_dlq.url

  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue",
    sourceQueueArns = [
      # Add SQS queue ARNs that have a DLQ associated here
      module.user_calendar_fetched_queue.sqs_queue_arn,
      module.actionable_event_found_queue.sqs_queue_arn
    ]
  })
}
