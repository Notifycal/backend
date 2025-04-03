resource "aws_sqs_queue" "global_dlq_sqs" {
  name = "global-dlq-sqs-${var.environment}.fifo"

  fifo_queue                  = true
  content_based_deduplication = true
}

resource "aws_sqs_queue" "global_dlq_lambda" {
  name = "global-dlq-lambda-${var.environment}"

  fifo_queue                  = false
  content_based_deduplication = false
}

resource "aws_sqs_queue" "global_dlq_unprocessable_sqs" {
  name = "global-dlq-unprocessable-sqs-${var.environment}.fifo"

  fifo_queue                  = true
  content_based_deduplication = true
}

resource "aws_sqs_queue" "global_unprocessable" {
  name = "global-unprocessable-${var.environment}"

  fifo_queue                  = false
  content_based_deduplication = false
}

resource "aws_sqs_queue_redrive_allow_policy" "dlq_redrive_allow_policy" {
  queue_url = aws_sqs_queue.global_dlq_sqs.url

  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue",
    sourceQueueArns = [
      # Add SQS queue ARNs that have a DLQ associated here
      module.user_calendar_fetched_queue.sqs_queue_arn,
      module.actionable_event_found_queue.sqs_queue_arn
    ]
  })
}
