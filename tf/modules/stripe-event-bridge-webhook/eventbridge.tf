locals {
  destinationId     = restapi_object.stripe_event_destination.api_data["id"]
  fullDestinationId = "aws.partner/stripe.com/${local.destinationId}"
}
resource "aws_cloudwatch_event_bus" "stripe" {
  name              = local.fullDestinationId
  event_source_name = local.fullDestinationId
  dynamic "dead_letter_config" {
    for_each = var.event_bus_dlq != null ? [var.event_bus_dlq] : []
    content {
      arn = dead_letter_config.value.arn
    }
  }
}

resource "aws_cloudwatch_event_rule" "stripe_event_rules" {
  for_each       = var.streams_to_return
  name           = "stripe-events-${each.value}-${var.environment}"
  description    = "Capture all Stripe events defined in Stripe event-destination API (configurable via module variable var.stripe_webhook_events)"
  event_bus_name = aws_cloudwatch_event_bus.stripe.name
  event_pattern = jsonencode({
    "source" = [{
      "prefix" : "aws.partner/stripe.com"
    }]
  })
}