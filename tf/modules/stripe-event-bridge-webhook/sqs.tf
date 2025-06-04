resource "aws_sqs_queue" "stripe_webhook_dlq" {
  name                      = "stripe-webhook-dlq-${var.environment}"
  message_retention_seconds = 1209600 # 14 days

  tags = {
    Environment = var.environment
    Service     = "stripe-webhooks"
  }
}

resource "aws_sqs_queue" "stripe_webhook" {
  name = "stripe-webhook-queue-${var.environment}"
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.stripe_webhook_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Environment = var.environment
    Service     = "stripe-webhooks"
  }
}

resource "aws_sqs_queue_policy" "stripe_webhook" {
  queue_url = aws_sqs_queue.stripe_webhook.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.stripe_webhook.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = [
              aws_cloudwatch_event_rule.stripe_event_rules["bla"].arn
            ]
          }
        }
      }
    ]
  })
}

resource "aws_sqs_queue" "stripe_webhook2" {
  name = "stripe-webhook-queue-${var.environment}-2"
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.stripe_webhook_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Environment = var.environment
    Service     = "stripe-webhooks"
  }
}

resource "aws_sqs_queue_policy" "stripe_webhook2" {
  queue_url = aws_sqs_queue.stripe_webhook2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.stripe_webhook2.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = [
              aws_cloudwatch_event_rule.stripe_event_rules["bla2"].arn
            ]
          }
        }
      }
    ]
  })
}
