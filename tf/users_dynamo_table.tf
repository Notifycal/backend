resource "aws_dynamodb_table" "users" {
  name           = "Users-${var.environment}"
  # TODO: Maybe change it to PROVISIONED in the future when the workloads are clear(er)
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "UserId" # Google email, right?

  # Only need to define attributes that are part of the key (hash/range) or Secondary indices
  attribute {
    name = "UserId"
    type = "S"
  }
}
