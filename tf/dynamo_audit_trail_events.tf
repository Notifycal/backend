resource "aws_dynamodb_table" "audit_trail_events" {
  name         = "AuditTrailEvents-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "EventId"

  attribute {
    name = "EventId"
    type = "S"
  }

  deletion_protection_enabled = var.deletion_protection_enabled

  stream_enabled   = true
  stream_view_type = "NEW_IMAGE"
}
