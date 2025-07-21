locals {
  integration_type = can(var.integration_config.eventbridge) ? "eventbridge" : "webhook"
}
