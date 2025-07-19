# # Example configurations for the refactored stripe-event-bridge-webhook module

# # Example 1: EventBridge Integration
# # This creates a Stripe Event Destination that routes events to AWS EventBridge
# module "stripe_eventbridge_example" {
#   source = "./"

#   environment          = "production"
#   aws_region           = "us-east-1"
#   stripe_admin_api_key = "sk_live_example"

#   integration_config = {
#     eventbridge = {
#       event_bus_dlq = {
#         arn = "arn:aws:sqs:us-east-1:123456789012:stripe-dlq"
#       }
#     }
#   }

#   stripe_webhook_events = [
#     "customer.subscription.created",
#     "customer.subscription.updated",
#     "invoice.payment_succeeded",
#     "invoice.payment_failed"
#   ]
# }

# # Example 2: Webhook Integration for Slack
# # This creates a Stripe Event Destination that sends events to a Slack webhook
# module "stripe_slack_webhook_example" {
#   source = "./"

#   environment          = "production"
#   aws_region           = "us-east-1" # Still required for the module, though not used for webhook
#   stripe_admin_api_key = "sk_live_example"

#   integration_config = {
#     webhook = {
#       url             = "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
#       method          = "POST"
#       timeout_seconds = 30
#       headers = {
#         "Content-Type" = "application/json"
#       }
#     }
#   }

#   stripe_webhook_events = [
#     "customer.subscription.created",
#     "invoice.payment_failed",
#     "checkout.session.completed"
#   ]
# }

# # Example 3: Generic REST API Webhook
# # This creates a Stripe Event Destination that sends events to any REST API endpoint
# module "stripe_generic_webhook_example" {
#   source = "./"

#   environment          = "staging"
#   aws_region           = "us-west-2"
#   stripe_admin_api_key = "sk_test_example"

#   integration_config = {
#     webhook = {
#       url             = "https://api.example.com/webhooks/stripe"
#       method          = "POST"
#       timeout_seconds = 15
#       headers = {
#         "Authorization" = "Bearer your-api-token"
#         "Content-Type"  = "application/json"
#         "X-Source"      = "stripe-webhook"
#       }
#     }
#   }

#   stripe_webhook_events = [
#     "customer.created",
#     "customer.updated",
#     "customer.deleted"
#   ]
# }

# # Output examples showing how different integration types return different data
# output "eventbridge_outputs" {
#   description = "Example outputs for EventBridge integration"
#   value = {
#     integration_type      = module.stripe_eventbridge_example.integration_type
#     event_destination_id  = module.stripe_eventbridge_example.stripe_event_destination_id
#     event_rules           = module.stripe_eventbridge_example.stripe_event_rules
#     eventbridge_event_bus = module.stripe_eventbridge_example.eventbridge_event_bus
#     webhook_config        = module.stripe_eventbridge_example.webhook_config
#   }
# }

# output "webhook_outputs" {
#   description = "Example outputs for webhook integration"
#   value = {
#     integration_type      = module.stripe_slack_webhook_example.integration_type
#     event_destination_id  = module.stripe_slack_webhook_example.stripe_event_destination_id
#     event_rules           = module.stripe_slack_webhook_example.stripe_event_rules
#     eventbridge_event_bus = module.stripe_slack_webhook_example.eventbridge_event_bus
#     webhook_config        = module.stripe_slack_webhook_example.webhook_config
#   }
#   sensitive = true
# }