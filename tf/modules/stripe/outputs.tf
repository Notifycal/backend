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

# # Tax configuration
# output "spain_tax_rate" {
#   description = "Spain VAT tax rate configuration"
#   value = {
#     id         = stripe_tax_rate.spain_vat.id
#     percentage = stripe_tax_rate.spain_vat.percentage
#     inclusive  = stripe_tax_rate.spain_vat.inclusive
#   }
# }

# # Quick reference for frontend/backend integration
# output "integration_config" {
#   description = "Configuration summary for application integration"
#   value = {
#     currency    = var.currency
#     environment = var.environment

#     # Subscription upgrade paths for upsells
#     upgrade_paths = {
#       good_to_better = {
#         from_price_id = stripe_price.monthly_prices["good"].id
#         to_price_id   = stripe_price.monthly_prices["better"].id
#         price_diff    = (var.subscription_tiers.better.price_cents - var.subscription_tiers.good.price_cents) / 100
#       }
#       good_to_best = {
#         from_price_id = stripe_price.monthly_prices["good"].id
#         to_price_id   = stripe_price.monthly_prices["best"].id
#         price_diff    = (var.subscription_tiers.best.price_cents - var.subscription_tiers.good.price_cents) / 100
#       }
#       better_to_best = {
#         from_price_id = stripe_price.monthly_prices["better"].id
#         to_price_id   = stripe_price.monthly_prices["best"].id
#         price_diff    = (var.subscription_tiers.best.price_cents - var.subscription_tiers.better.price_cents) / 100
#       }
#     }
#   }
# }
