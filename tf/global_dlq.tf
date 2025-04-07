locals {
  dlq_queues = {
    global               = aws_sqs_queue.global_dlq_sqs,
    global_lambda        = aws_sqs_queue.global_dlq_lambda,
    global_unprocessable = aws_sqs_queue.global_dlq_unprocessable_sqs,
  }
}

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

resource "aws_cloudwatch_metric_alarm" "sqs_dlq_number_of_messages" {
  for_each = var.observability != null ? local.dlq_queues : {}

  # Intent:
  # "This alarm detects when a dead-letter queue (DLQ) contains one or more messages. 
  # Messages in a DLQ indicate failures in downstream processing or retries that exceeded the max attempts.
  # Triggering this alarm helps ensure timely investigation of failure patterns and prevents silent message loss."

  # Threshold Justification:
  # "Set the threshold to zero to detect any presence of messages in the DLQ.
  # A well-functioning system should have an empty DLQ under normal operation.
  # Any non-zero count suggests potential processing errors, misconfigurations, or unexpected behavior that needs attention."

  alarm_name                = "AWS/SQS DLQ Messages ${each.value["name"]}"
  alarm_description         = "This alarm detects messages in the DLQ: ${each.key}"
  actions_enabled           = true
  ok_actions                = local.alarm_actions
  alarm_actions             = local.alarm_actions
  insufficient_data_actions = local.alarm_actions
  metric_name               = "NumberOfMessagesReceived"
  namespace                 = "AWS/SQS"
  statistic                 = "Sum"
  period                    = 60
  evaluation_periods        = 5
  datapoints_to_alarm       = 1
  threshold                 = 0
  comparison_operator       = "GreaterThanThreshold"
  treat_missing_data        = "ignore"
  dimensions = {
    QueueName = each.value["name"]
  }
}
