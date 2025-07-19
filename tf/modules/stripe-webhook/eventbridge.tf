locals {
  destination_id      = restapi_object.stripe_event_destination.api_data["id"]
  full_destination_id = "aws.partner/stripe.com/${local.destination_id}"
  event_bus_dlq       = local.integration_type == "eventbridge" ? var.integration_config.eventbridge.event_bus_dlq : null
  streams_to_return   = local.integration_type == "eventbridge" ? var.integration_config.eventbridge.streams_to_return : toset([])
}

resource "aws_cloudwatch_event_bus" "stripe" {
  count             = local.integration_type == "eventbridge" ? 1 : 0
  name              = local.full_destination_id
  event_source_name = local.full_destination_id
  dynamic "dead_letter_config" {
    for_each = local.event_bus_dlq != null ? [local.event_bus_dlq] : []
    content {
      arn = dead_letter_config.value.arn
    }
  }
}

resource "aws_cloudwatch_event_rule" "stripe_event_rules" {
  for_each       = local.integration_type == "eventbridge" ? local.streams_to_return : []
  name           = "stripe-events-${each.value}-${var.environment}"
  description    = "Contains all Stripe events defined in Stripe event-destination API"
  event_bus_name = aws_cloudwatch_event_bus.stripe[0].name
  event_pattern = jsonencode({
    "source" = [{
      "prefix" : "aws.partner/stripe.com"
    }]
  })
}