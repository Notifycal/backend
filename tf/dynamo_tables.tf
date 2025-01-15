resource "aws_dynamodb_table" "users" {
  name = "Users-${var.environment}"
  # TODO: Maybe change it to PROVISIONED in the future when the workloads are clear(er)
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "UserId"
  range_key    = "IdpUserId"

  # Only need to define attributes that are part of the key (hash/range) or Secondary indices
  attribute {
    name = "UserId"
    type = "S"
  }
  attribute {
    name = "IdpUserId"
    type = "S"
  }

  deletion_protection_enabled = true
}

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
