locals {
  create_payment_plan = {
    for key, config in merge(var.subscription_tiers, var.topups) : key => {
      product_id          = key == keys(var.subscription_tiers)[0] || key == keys(var.subscription_tiers)[1] || key == keys(var.subscription_tiers)[2] ? stripe_product.subscription_tiers[key].id : stripe_product.topups[key].id
      price_id            = key == keys(var.subscription_tiers)[0] || key == keys(var.subscription_tiers)[1] || key == keys(var.subscription_tiers)[2] ? stripe_price.monthly_prices[key].id : stripe_price.topup_prices[key].id
      name                = config.name
      price_eur           = config.price_cents / 100
      number_of_reminders = floor(config.price_cents / 100 / var.country_to_sms_cost_map["ES"])
      credits             = config.credits
    }
  }

  payment_plans = {
    tiers  = { for k, v in local.create_payment_plan : k => v if contains(keys(var.subscription_tiers), k) }
    topups = { for k, v in local.create_payment_plan : k => v if contains(keys(var.topups), k) }
  }
}