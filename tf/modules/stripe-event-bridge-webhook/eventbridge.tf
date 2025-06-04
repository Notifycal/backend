locals {
  destinationId     = restapi_object.stripe_event_destination.api_data["id"]
  fullDestinationId = "aws.partner/stripe.com/${local.destinationId}"
}
resource "aws_cloudwatch_event_bus" "stripe" {
  name              = local.fullDestinationId
  event_source_name = local.fullDestinationId
  #  dead_letter_config = ""
}

resource "aws_cloudwatch_event_rule" "stripe_event_rules" {
  for_each = {
    bla  = "1"
    bla2 = "2"
  }
  name           = "stripe-events-${var.environment}-${each.value}"
  description    = "Capture all Stripe events defined by Stripe event-destination API"
  event_bus_name = aws_cloudwatch_event_bus.stripe.name

  event_pattern = jsonencode({
    "source" = [{
      "prefix" : "aws.partner/stripe.com"
    }]
  })
}

resource "aws_cloudwatch_event_target" "sqs" {
  # for_each       = aws_cloudwatch_event_rule.stripe_event_rules
  rule           = aws_cloudwatch_event_rule.stripe_event_rules["bla"].name
  event_bus_name = aws_cloudwatch_event_bus.stripe.name
  target_id      = "SendToSQS"
  arn            = aws_sqs_queue.stripe_webhook.arn
}

resource "aws_cloudwatch_event_target" "sqs2" {
  # for_each       = aws_cloudwatch_event_rule.stripe_event_rules
  rule           = aws_cloudwatch_event_rule.stripe_event_rules["bla2"].name
  event_bus_name = aws_cloudwatch_event_bus.stripe.name
  target_id      = "SendToSQS2"
  arn            = aws_sqs_queue.stripe_webhook2.arn
}

