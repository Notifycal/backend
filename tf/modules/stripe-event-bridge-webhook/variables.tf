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