locals {
  payment_plans = {
    for tier, config in var.subscription_tiers : tier => {
      product_id = stripe_product.subscription_tiers[tier].id
      price_id   = stripe_price.monthly_prices[tier].id
      name       = config.name
      price_eur  = config.price_cents / 100
    }
  }
}
