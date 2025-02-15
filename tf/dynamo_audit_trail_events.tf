resource "aws_dynamodb_table" "audit_trail_events" {
  name         = "AuditTrailEvents-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "EventId"
  ttl {
    attribute_name = "ExpiresAt"
    enabled        = true
  }
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  attribute {
    name = "EventId"
    type = "S"
  }

  deletion_protection_enabled = true
}
