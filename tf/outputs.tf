# for debugging purposes mostly
output "rendered_openapi_spec" {
  value = local.rendered_openapi_spec
}

locals {
  _service_registration_url = format(
    "https://%s.%s",
    var.domain_prefix,
    var.base_domain
  )
}
