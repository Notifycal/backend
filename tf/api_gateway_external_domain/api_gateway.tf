data "aws_acm_certificate" "ssl_cert" {
  domain      = "*.${var.base_domain}"
  types       = ["AMAZON_ISSUED"]
  most_recent = true
}

resource "aws_api_gateway_domain_name" "custom_domain" {
  domain_name              = "${var.domain_prefix}.${var.base_domain}"
  regional_certificate_arn = data.aws_acm_certificate.ssl_cert.arn

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# Required to associate the custom domain with the API
resource "aws_api_gateway_base_path_mapping" "mapping" {
  api_id      = var.rest_api_id
  stage_name  = var.stage_name
  domain_name = aws_api_gateway_domain_name.custom_domain.domain_name
}
