locals {
  country_to_sms_cost_map = {
    ES = 1.3
  }
  credits_per_tier = {
    good   = 100
    better = 350
    best   = 1000
  }
  payment_plans = {
    tiers = {
      for tier, data in var.subscription_tiers :
      tier => {
        id      = tier
        priceId = data.price_id
        credits = local.credits_per_tier[tier]
      }
    }
  }
}
