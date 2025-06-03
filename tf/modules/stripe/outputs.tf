output "subscription_tiers" {
  description = "Subscription tier configuration with Stripe IDs"
  value = {
    for tier, config in var.subscription_tiers : tier => {
      product_id = stripe_product.subscription_tiers[tier].id
      price_id   = stripe_price.monthly_prices[tier].id
      name       = config.name
      price_eur  = config.price_cents / 100
    }
  }
}

output "spain_tax_rate" {
  description = "Spain VAT tax rate configuration"
  value = {
    id         = stripe_tax_rate.spain_vat.id
    percentage = stripe_tax_rate.spain_vat.percentage
    inclusive  = stripe_tax_rate.spain_vat.inclusive
  }
}