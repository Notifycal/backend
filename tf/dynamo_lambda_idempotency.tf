locals {
  idempotency_table_config = {
    hash_attribute_name          = "RunId"
    expiration_attribute_name    = "Expiration"
    status_attribute_name        = "Status"
    in_progress_expiry_attribute = "InProgressExpiration"
    data_attribute_name          = "Data"
    validation_attribute_name    = "Validation"
  }
  lambda_idempotency_table_config = jsonencode({
    tableName            = aws_dynamodb_table.lambda_idempotency.name,
    keyAttr              = local.idempotency_table_config.hash_attribute_name,
    expiryAttr           = local.idempotency_table_config.expiration_attribute_name,
    inProgressExpiryAttr = local.idempotency_table_config.in_progress_expiry_attribute,
    statusAttr           = local.idempotency_table_config.status_attribute_name
    dataAttr             = local.idempotency_table_config.data_attribute_name
    validationKeyAttr    = local.idempotency_table_config.validation_attribute_name
  })
}

# making this "abstract" for all lambdas in case we add
# more idempotency in the future
resource "aws_dynamodb_table" "lambda_idempotency" {
  name         = "LambdaIdempotency-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = local.idempotency_table_config.hash_attribute_name
  attribute {
    name = local.idempotency_table_config.hash_attribute_name
    type = "S"
  }
  ttl {
    attribute_name = local.idempotency_table_config.expiration_attribute_name
    enabled        = true
  }
}
