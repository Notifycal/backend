output "stripe_event_rules" {
  description = "Map of Stripe event rules with event bus and rule names"
  value = {
    for stream_key, rule in aws_cloudwatch_event_rule.stripe_event_rules : stream_key => {
      event_bus_name      = rule.event_bus_name
      event_bus_rule_name = rule.name
      event_bus_rule_arn  = rule.arn
    }
  }
}
