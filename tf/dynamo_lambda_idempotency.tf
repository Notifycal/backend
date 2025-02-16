# making this "abstract" for all lambdas in case we add
# more idempotency in the future
resource "aws_dynamodb_table" "lambda_idempotency" {
  name         = "LambdaIdempotency-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "RunId"
  attribute {
    name = "RunId"
    type = "S"
  }
  ttl {
    attribute_name = "Expiration"
    enabled        = true
  }
}
