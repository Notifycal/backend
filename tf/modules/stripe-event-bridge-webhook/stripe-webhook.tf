data "aws_caller_identity" "current" {}

locals {
  aws_account_id = data.aws_caller_identity.current.account_id
  update_request_payload = {
    name           = "EventBridge-${var.environment}"
    description    = "EventBridge ${var.environment}"
    include        = []
    enabled_events = var.stripe_webhook_events
    metadata = {
      environment = var.environment
    }
  }
  create_request_payload = merge(local.update_request_payload, {
    type          = "amazon_eventbridge"
    event_payload = "snapshot"
    events_from   = ["self"]
    amazon_eventbridge = {
      aws_account_id = local.aws_account_id
      aws_region     = var.aws_region
    }
  })

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
  debug        = true
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
  data           = jsonencode(local.create_request_payload)
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