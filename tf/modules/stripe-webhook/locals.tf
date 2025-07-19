locals {
  integration_type = var.integration_config.eventbridge != null ? "eventbridge" : "webhook"
}
