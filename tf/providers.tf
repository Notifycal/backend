provider "restapi" {
  uri                   = "https://api.stripe.com/v2"
  write_returns_object  = true
  create_returns_object = true
  headers = {
    Authorization  = "Bearer ${var.stripe_admin_api_key}"
    Stripe-Version = var.stripe_api_version
    Content-Type   = "application/json"
  }
}
