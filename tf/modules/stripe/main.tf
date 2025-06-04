resource "stripe_product" "subscription_tiers" {
  for_each = var.subscription_tiers

  name        = each.value.name
  description = each.value.description
  metadata = {
    tier = each.key
  }
}

resource "stripe_price" "monthly_prices" {
  for_each = var.subscription_tiers

  product  = stripe_product.subscription_tiers[each.key].id
  currency = var.currency
  recurring {
    interval       = "month"
    interval_count = 1
  }
  unit_amount    = each.value.price_cents
  tax_behavior   = "inclusive"
  billing_scheme = "per_unit"
  metadata = {
    tier      = each.key
    price_eur = each.value.price_cents / 100
  }
}

resource "stripe_tax_rate" "spain_vat" {
  display_name = "Spanish VAT"
  description  = "Spanish Value Added Tax"
  jurisdiction = "ES"
  percentage   = var.spain_vat_percentage
  inclusive    = true
  active       = true
  metadata = {
    country = "ES"
    type    = "VAT"
  }
}
