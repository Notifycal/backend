resource "aws_dynamodb_table" "business_alerts" {
  name         = "BusinessAlerts-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "HashKey"
  range_key    = "SortKey"

  attribute {
    name = "HashKey"
    type = "S"
  }
  attribute {
    name = "SortKey"
    type = "S"
  }
  ttl {
    attribute_name = "ExpiresAt"
    enabled        = true
  }

  deletion_protection_enabled = var.deletion_protection_enabled
}
