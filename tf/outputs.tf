# for debugging purposes mostly
output "rendered_openapi_spec" {
  value = local.rendered_openapi_spec
}

locals {
  _service_registration_url = var.api_gateway_custom_domain_enabled ? module.apigateway_custom_domain[0].invoke_url : aws_api_gateway_stage.stage.invoke_url
}


output "global_dlq_lambdas" {
  value = aws_sqs_queue.global_dlq_lambda.arn
}

output "global_dlq_sqs" {
  value = aws_sqs_queue.global_dlq_sqs.arn
}
