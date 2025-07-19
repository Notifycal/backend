provider "restapi" {
  uri                   = "https://api.stripe.com/v2"
  write_returns_object  = true
  create_returns_object = true
  headers = {
    Authorization  = "Bearer ${var.stripe_admin_api_key}"
    Stripe-Version = var.stripe_api_version
    Content-Type   = "application/json"
  }
}

module "stripe_admin_webhook" {
  count                = var.stripe_admin_webhook_url != null ? 1 : 0
  source               = "./modules/stripe-webhook"
  environment          = var.environment
  aws_region           = var.aws_region
  api_version          = var.stripe_api_version
  stripe_admin_api_key = var.stripe_admin_api_key
  stripe_webhook_events = [
    # Disputes
    "issuing_dispute.closed",
    "issuing_dispute.created",
    "issuing_dispute.funds_reinstated",
    "issuing_dispute.funds_rescinded",
    "issuing_dispute.submitted",
    "issuing_dispute.updated",
    "charge.dispute.closed",
    "charge.dispute.created",
    "charge.dispute.funds_reinstated",
    "charge.dispute.funds_withdrawn",
    "charge.dispute.updated",
    # New Customer
    "customer.created",
    # Application fees
    "application_fee.created",
    "application_fee.refund.updated",
    "application_fee.refunded",
    # Charges
    "charge.captured",
    "charge.dispute.closed",
    "charge.dispute.created",
    "charge.dispute.funds_reinstated",
    "charge.dispute.funds_withdrawn",
    "charge.dispute.updated",
    "charge.expired",
    "charge.failed",
    "charge.pending",
    "charge.refund.updated",
    "charge.refunded",
    "charge.succeeded",
    "charge.updated",
    # Subscriptions
    "customer.subscription.created",
    "customer.subscription.deleted",
    "customer.subscription.paused",
    "customer.subscription.pending_update_applied",
    "customer.subscription.pending_update_expired",
    "customer.subscription.resumed",
    "customer.subscription.trial_will_end",
    "customer.subscription.updated",
    #Plans
    "plan.created",
    "plan.deleted",
    "plan.updated",
  ]
  integration_config = {
    webhook = {
      url = var.stripe_admin_webhook_url
    }
  }
}
