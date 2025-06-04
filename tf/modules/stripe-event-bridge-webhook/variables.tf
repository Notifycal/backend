variable "stripe_webhook_events" {
  description = "List of Stripe webhook events to listen for"
  type        = list(string)
  default = [
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.payment_succeeded",
    "invoice.payment_failed",
    "customer.subscription.trial_will_end",
    "checkout.session.completed"
  ]
}

variable "event_bus_dlq" {
  type = object({
    arn = optional(string, null)
  })
  description = <<EOT
[Lifted from original docs] Configuration details of the Amazon SQS queue for EventBridge to use as a dead-letter queue (DLQ). 
This block supports the following arguments:
  arn - (Optional) The ARN of the SQS queue specified as the target for the dead-letter queue.
EOT
  default     = null
}

variable "streams_to_return" {
  type        = set(string)
  description = "EventBridge fanout. It creates as many EventBridge rules off the event bus as items present in this set parameter."
  default     = ["all-events"]
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