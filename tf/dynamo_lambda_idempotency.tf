locals {
  lambda_idempotency_table_config = {
    hash_attribute_name          = "RunId"
    expiration_attribute_name    = "Expiration"
    status_attribute_name        = "Status"
    in_progress_expiry_attribute = "InProgressExpiration"
    data_attribute_name          = "Data"
    validation_attribute_name    = "Validation"
  }
}

# making this "abstract" for all lambdas in case we add
# more idempotency in the future
resource "aws_dynamodb_table" "lambda_idempotency" {
  name         = "LambdaIdempotency-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = local.lambda_idempotency_table_config.hash_attribute_name
  attribute {
    name = local.lambda_idempotency_table_config.hash_attribute_name
    type = "S"
  }
  ttl {
    attribute_name = local.lambda_idempotency_table_config.expiration_attribute_name
    enabled        = true
  }
}
