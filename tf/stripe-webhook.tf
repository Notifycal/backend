locals {
  streams_to_return = ["all-events"]
}
module "stripe_webhook" {
  source               = "./modules/stripe-event-bridge-webhook"
  environment          = var.environment
  aws_region           = var.aws_region
  api_version          = var.stripe_api_version
  stripe_admin_api_key = var.stripe_admin_api_key
  stripe_webhook_events = [
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
  streams_to_return = toset(local.streams_to_return)
}

resource "aws_cloudwatch_event_target" "all_events" {
  for_each       = module.stripe_webhook.stripe_event_rules
  rule           = each.value.event_bus_rule_name
  event_bus_name = each.value.event_bus_name
  target_id      = each.key
  arn            = module.stripe_webhook_queue.sqs_queue_arn
  sqs_target {
    message_group_id = "stripe-events-${each.key}"
  }
}

module "stripe_webhook_queue" {
  source     = "./modules/sqs"
  queue_name = "stripe-webhook-${var.environment}"
  sender_arns = toset([
    module.stripe_webhook.stripe_event_rules[local.streams_to_return[0]].event_bus_rule_arn
  ])
  receiver_arn = module.stripe_webhook_lambda.lambda_function_arn
  tags         = local.common_tags

  redrive_policy = {
    max_receive_count      = 2
    dead_letter_target_arn = aws_sqs_queue.global_dlq_unprocessable_sqs.arn
  }
}