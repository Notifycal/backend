resource "aws_dynamodb_table" "business_alerts" {
  name         = "BusinessAlerts-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "AlertName"
  range_key    = "AlertDiscriminator"

  attribute {
    name = "AlertName"
    type = "S"
  }
  attribute {
    name = "AlertDiscriminator"
    type = "S"
  }
  ttl {
    attribute_name = "ExpiresAt"
    enabled        = true
  }

  deletion_protection_enabled = var.deletion_protection_enabled
}
