variable "stripe_webhook_events" {
  description = "List of Stripe webhook events to listen for"
  type        = list(string)
  default = [
    "customer.created",
    "customer.updated",
    "customer.deleted",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "customer.subscription.paused",
    "customer.subscription.resumed",
    "invoice.payment_succeeded",
    "invoice.payment_failed",
    "checkout.session.completed"
  ]
}

variable "integration_config" {
  description = "Configuration for the integration (provide either eventbridge or webhook block)"
  type = object({
    # EventBridge-specific configuration
    eventbridge = optional(object({
      event_bus_dlq = optional(object({
        arn = optional(string, null)
      }), null)
      streams_to_return = optional(set(string), ["all-events"])
    }), null)

    # Webhook-specific configuration  
    webhook = optional(object({
      url = string
    }), null)
  })

  validation {
    condition     = (var.integration_config.eventbridge != null) != (var.integration_config.webhook != null)
    error_message = "Exactly one of 'eventbridge' or 'webhook' configuration must be provided."
  }

  validation {
    condition = (
      var.integration_config.webhook != null ?
      can(regex("^https?://", var.integration_config.webhook.url)) :
      true
    )
    error_message = "Webhook URL must be a valid HTTP or HTTPS URL."
  }
}

variable "api_version" {
  type    = string
  default = "2025-05-28.basil"
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "stripe_admin_api_key" {
  type = string
}
