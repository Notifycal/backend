data "cloudflare_zone" "main" {
  name = var.dns_zone
}

# This is on a per-API basis, it will cover more stages if we add them in the future
resource "cloudflare_record" "main" {
  zone_id = data.cloudflare_zone.main.id

  name    = var.cname_record.name
  content = var.cname_record.value
  type    = "CNAME"
  proxied = false
}
