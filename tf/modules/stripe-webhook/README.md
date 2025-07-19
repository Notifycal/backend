# Stripe Event Destination Module

This Terraform module creates a Stripe Event Destination that can integrate with either AWS EventBridge or REST API webhooks.

## Supported Integration Types

### 1. EventBridge Integration
Routes Stripe events to AWS EventBridge for event-driven architecture.

### 2. Webhook Integration  
Sends Stripe events directly to a REST API endpoint (e.g., Slack webhooks).

## Usage Examples

### Two-Module Setup (Recommended)

#### 1. EventBridge for Normal Operations

```hcl
module "stripe_user_events" {
  source = "./modules/stripe-event-bridge-webhook"
  
  environment = "production"
  aws_region  = "us-east-1"
  stripe_admin_api_key = var.stripe_admin_api_key
  
  integration_config = {
    eventbridge = {
      event_bus_dlq = {
        arn = aws_sqs_queue.user_events_dlq.arn
      }
      streams_to_return = ["user-events", "analytics-events"]  # Fanout to multiple targets
    }
  }
  
  # Normal user operation events
  stripe_webhook_events = [
    "customer.subscription.created",
    "customer.subscription.updated", 
    "customer.subscription.deleted",
    "invoice.payment_succeeded",
    "checkout.session.completed"
  ]
}

# You can then target different streams to different SQS queues/Lambdas
resource "aws_cloudwatch_event_target" "user_processing" {
  rule      = module.stripe_user_events.stripe_event_rules["user-events"].event_bus_rule_name
  event_bus_name = module.stripe_user_events.eventbridge_event_bus.name
  target_id = "UserProcessingQueue"
  arn       = aws_sqs_queue.user_processing.arn
}

resource "aws_cloudwatch_event_target" "analytics_processing" {
  rule      = module.stripe_user_events.stripe_event_rules["analytics-events"].event_bus_rule_name
  event_bus_name = module.stripe_user_events.eventbridge_event_bus.name
  target_id = "AnalyticsLambda"
  arn       = aws_lambda_function.analytics.arn
}
```

#### 2. Slack Webhook for Admin Alerts

```hcl
module "stripe_admin_alerts" {
  source = "./modules/stripe-event-bridge-webhook"
  
  environment = "production"
  aws_region  = "us-east-1"
  stripe_admin_api_key = var.stripe_admin_api_key
  
  integration_config = {
    webhook = {
      url = "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
      method = "POST"
      timeout_seconds = 30
      headers = {
        "Content-Type" = "application/json"
      }
    }
  }
  
  # Admin-relevant events that need immediate attention
  stripe_webhook_events = [
    "invoice.payment_failed",
    "customer.dispute.created",
    "payment_intent.payment_failed", 
    "charge.dispute.created",
    "subscription_schedule.canceled"
  ]
}
```

## Variables

### Required Variables

- `environment` - Environment name (e.g., "production", "staging")
- `aws_region` - AWS region (required for EventBridge integration)
- `stripe_admin_api_key` - Stripe admin API key
- `integration_config` - Integration configuration object (see examples above)

### Optional Variables

- `stripe_webhook_events` - List of Stripe events to listen for (has sensible defaults)
- `api_version` - Stripe API version (default: "2025-05-28.basil")

## Outputs

### Common Outputs
- `integration_type` - The configured integration type
- `stripe_event_destination_id` - The Stripe Event Destination ID

### EventBridge-specific Outputs
- `stripe_event_rules` - Map of EventBridge rules
- `eventbridge_event_bus` - EventBridge event bus details

### Webhook-specific Outputs
- `webhook_config` - Webhook configuration (marked as sensitive)

## Integration Type Validation

The module includes rich validation to ensure:
- Integration type is either "eventbridge" or "webhook"
- Required configuration blocks are provided for the selected type
- Webhook URLs are valid HTTP/HTTPS URLs

## Migration from Previous Version

If you're migrating from the previous EventBridge-only version:

**Before:**
```hcl
module "stripe_eventbridge" {
  # ... other config
  event_bus_dlq = { arn = aws_sqs_queue.dlq.arn }
  streams_to_return = ["all-events"]
}
```

**After:**
```hcl
module "stripe_eventbridge" {
  # ... other config
  integration_config = {
    eventbridge = {
      event_bus_dlq = { arn = aws_sqs_queue.dlq.arn }
      streams_to_return = ["all-events"]  # Still supported for fanout
    }
  }
}
```