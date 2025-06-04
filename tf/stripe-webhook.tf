module "stripe_webhook" {
  source               = "./modules/stripe-event-bridge-webhook"
  environment          = var.environment
  aws_region           = var.aws_region
  api_version          = var.stripe_api_version
  stripe_admin_api_key = var.stripe_admin_api_key
  stripe_webhook_events = [
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.payment_succeeded",
    "invoice.payment_failed",
    "customer.subscription.trial_will_end",
    "checkout.session.completed"
  ]
}
