data "cloudflare_zone" "main" {
  name = var.base_domain
}

# This is on a per-API basis, it will cover more stages if we add them in the future
resource "cloudflare_record" "main" {
  zone_id = data.cloudflare_zone.main.id

  name = var.domain_prefix
  # Dropping HTTPS and stage for DNS CNAME
  content = regex("https://([^/]+)", aws_api_gateway_deployment.api_deployment.invoke_url)[0]
  type    = "CNAME"
  proxied = false
}
