output "invoke_url" {
  value = "https://${aws_api_gateway_domain_name.custom_domain.domain_name}"
}
