module "cloudflare" {
  source   = "./cloudflare"
  count    = var.cloudflare_enabled ? 1 : 0
  dns_zone = var.base_domain
  cname_record = {
    name  = var.domain_prefix
    value = aws_api_gateway_domain_name.custom_domain[0].regional_domain_name
  }
}
