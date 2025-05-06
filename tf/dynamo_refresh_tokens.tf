resource "aws_dynamodb_table" "refresh_tokens" {
  name         = "RefreshTokens-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "UserId"
  range_key    = "RefreshTokenId"
  ttl {
    attribute_name = "ExpiresAt"
    enabled        = true
  }

  attribute {
    name = "UserId"
    type = "S"
  }
  attribute {
    name = "RefreshTokenId"
    type = "S"
  }

  deletion_protection_enabled = var.deletion_protection_enabled
}
