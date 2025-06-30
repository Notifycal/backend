module "apigateway_custom_domain" {
  source        = "./modules/api_gateway_external_domain"
  count         = var.api_gateway_custom_domain_enabled ? 1 : 0
  base_domain   = var.base_domain
  domain_prefix = var.domain_prefix
  rest_api_id   = aws_api_gateway_rest_api.rest_api.id
  stage_name    = aws_api_gateway_stage.stage.stage_name
  domain_ttl    = var.api_gateway_custom_domain_ttl
}
