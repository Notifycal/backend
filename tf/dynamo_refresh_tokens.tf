resource "aws_dynamodb_table" "refresh_tokens" {
  name         = "RefreshTokens-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "UserId"
  range_key    = "RefreshTokenId"
  ttl {
    attribute_name = "ExpiresAt"
    enabled        = true
  }
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  attribute {
    name = "UserId"
    type = "S"
  }
  attribute {
    name = "RefreshTokenId"
    type = "S"
  }

  deletion_protection_enabled = true
}
