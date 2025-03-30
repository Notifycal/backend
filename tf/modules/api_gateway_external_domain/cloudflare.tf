data "cloudflare_zone" "main" {
  filter = {
    name = var.base_domain
  }
}

# This is on a per-API basis, it will cover more stages if we add them in the future
resource "cloudflare_dns_record" "main" {
  zone_id = data.cloudflare_zone.main.zone_id

  name    = var.domain_prefix
  content = aws_api_gateway_domain_name.custom_domain.regional_domain_name
  type    = "CNAME"
  proxied = false
  ttl     = 3600
}
