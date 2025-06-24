locals {
  country_to_sms_cost_map = {
    ES = 1.3
  }
  payment_plans = {
    for tier, config in var.subscription_tiers : tier => {
      product_id          = stripe_product.subscription_tiers[tier].id
      price_id            = stripe_price.monthly_prices[tier].id
      name                = config.name
      price_eur           = config.price_cents / 100
      number_of_reminders = floor(config.price_cents / 100 / local.country_to_sms_cost_map["ES"])
    }
  }
}
