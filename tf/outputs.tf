# for debugging purposes mostly
output "rendered_openapi_spec" {
  value = local.rendered_openapi_spec
}

locals {
  _service_registration_url = aws_api_gateway_deployment.api_deployment.invoke_url
}
