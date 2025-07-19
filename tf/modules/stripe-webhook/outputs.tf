output "integration_type" {
  description = "The type of integration configured (eventbridge or webhook)"
  value       = local.integration_type
}

output "stripe_event_destination_id" {
  description = "The ID of the created Stripe Event Destination"
  value       = restapi_object.stripe_event_destination.api_data["id"]
}

output "stripe_event_rules" {
  description = "Map of Stripe event rules with event bus and rule names (only populated for EventBridge integration)"
  value = local.integration_type == "eventbridge" ? {
    for stream_key, rule in aws_cloudwatch_event_rule.stripe_event_rules : stream_key => {
      event_bus_name      = rule.event_bus_name
      event_bus_rule_name = rule.name
      event_bus_rule_arn  = rule.arn
    }
  } : {}
}

output "webhook_config" {
  description = "Webhook configuration details (only populated for webhook integration)"
  value       = local.integration_type == "webhook" ? var.integration_config.webhook : null
}
