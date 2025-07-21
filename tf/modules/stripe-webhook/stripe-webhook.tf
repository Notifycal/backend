data "aws_caller_identity" "current" {
  count = local.integration_type == "eventbridge" ? 1 : 0
}

locals {
  aws_account_id = local.integration_type == "eventbridge" ? data.aws_caller_identity.current[0].account_id : null

  webhook_name = "${local.integration_type}-${var.environment}"
  base_payload = {
    name           = local.webhook_name
    description    = "${title(local.integration_type)} integration ${var.environment}"
    include        = []
    enabled_events = var.stripe_webhook_events
    metadata = {
      environment = var.environment
      type        = local.integration_type
    }
  }

  base_create_payload = merge(local.base_payload, {
    event_payload = "snapshot"
    events_from   = ["self"]
  })
  create_eventbridge_payload = merge(local.base_create_payload, {
    type = "amazon_eventbridge"
    amazon_eventbridge = local.integration_type == "eventbridge" ? {
      aws_account_id = local.aws_account_id
      aws_region     = var.aws_region
    } : null
    webhook_endpoint = null
  })
  create_webhook_payload = merge(local.base_create_payload, {
    type               = "webhook_endpoint"
    amazon_eventbridge = null
    webhook_endpoint = local.integration_type == "webhook" ? {
      url = var.integration_config.webhook.url
    } : null
  })
  create_request_payload = local.integration_type == "eventbridge" ? local.create_eventbridge_payload : local.create_webhook_payload
  update_request_payload = local.base_payload
}

resource "restapi_object" "stripe_event_destination" {
  path         = "/core/event_destinations"
  id_attribute = "id"
  ignore_changes_to = [
    "amazon_eventbridge",
    "webhook_endpoint",
    "enabled_events",
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
