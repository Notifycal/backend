data "aws_caller_identity" "current" {
  count = local.integration_type == "eventbridge" ? 1 : 0
}

locals {
  aws_account_id = local.integration_type == "eventbridge" ? data.aws_caller_identity.current[0].account_id : null

  # Common payload for both integration types
  base_payload = {
    name           = "${local.integration_type}-${var.environment}"
    description    = "${title(local.integration_type)} integration ${var.environment}"
    include        = []
    enabled_events = var.stripe_webhook_events
    metadata = {
      environment = var.environment
      type        = local.integration_type
    }
  }

  # EventBridge payload (only create if eventbridge config exists)
  eventbridge_payload = local.integration_type == "eventbridge" ? merge(local.base_payload, {
    type          = "amazon_eventbridge"
    event_payload = "snapshot"
    events_from   = ["self"]
    amazon_eventbridge = {
      aws_account_id = local.aws_account_id
      aws_region     = var.aws_region
    }
  }) : null

  # Webhook payload (only create if webhook config exists)
  webhook_payload = local.integration_type == "webhook" ? merge(local.base_payload, {
    type          = "webhook_endpoint"
    event_payload = "snapshot"
    events_from   = ["self"]
    webhook_endpoint = {
      url = var.integration_config.webhook.url
    }
  }) : null

  # Use the appropriate payload (convert to string to avoid type checking)
  create_request_payload_json = local.integration_type == "eventbridge" ? jsonencode(local.eventbridge_payload) : jsonencode(local.webhook_payload)
  update_request_payload      = local.integration_type == "eventbridge" ? merge(local.base_payload, { name = "event-bridge-bus-${var.environment}" }) : merge(local.base_payload, { name = "webhook-${var.environment}" })
}

provider "restapi" {
  alias = "stripe_v2"
  # Docs: https://docs.stripe.com/api/v2/core/event_destinations?lang=curl
  uri                   = "https://api.stripe.com/v2"
  write_returns_object  = true
  create_returns_object = true
  headers = {
    Authorization  = "Bearer ${var.stripe_admin_api_key}"
    Stripe-Version = var.api_version
    Content-Type   = "application/json"
  }
}

resource "restapi_object" "stripe_event_destination" {
  provider     = restapi.stripe_v2
  path         = "/core/event_destinations"
  id_attribute = "id"
  ignore_changes_to = [
    "amazon_eventbridge",
    "created",
    "id",
    "include",
    "livemode",
    "object",
    "snapshot_api_version",
    "status",
    "status_details",
    "updated"
  ]
  data           = local.create_request_payload_json
  update_data    = jsonencode(local.update_request_payload)
  create_method  = "POST"
  create_path    = "/core/event_destinations"
  read_method    = "GET"
  read_path      = "/core/event_destinations/{id}"
  update_method  = "POST"
  update_path    = "/core/event_destinations/{id}"
  destroy_method = "DELETE"
  destroy_path   = "/core/event_destinations/{id}"
}
