//TODO: adjust for minimum smoke
locals {
  payment_plans = {
    tiers = {
      good = {
        id      = "good"
        priceId = var.subscription_tiers["good"].price_id
        credits = 100
      },
      better = {
        id : "better"
        priceId = var.subscription_tiers["better"].price_id
        credits = 350
      },
      best = {
        id      = "best"
        priceId = var.subscription_tiers["best"].price_id
        credits = 1000
      }
    }
  }


  country_to_sms_cost_map = {
    ES = 1.3
  }
}
