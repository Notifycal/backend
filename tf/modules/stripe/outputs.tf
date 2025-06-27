output "subscription_tiers" {
  description = "Subscription tier configuration with Stripe IDs"
  value       = local.payment_plans
}

output "spain_tax_config" {
  description = "Spain VAT tax rate configuration"
  value = {
    id         = stripe_tax_rate.spain_vat.id
    percentage = stripe_tax_rate.spain_vat.percentage
    inclusive  = stripe_tax_rate.spain_vat.inclusive
  }
}

output "customer_portal_configuration_id" {
  value = stripe_portal_configuration.portal_configuration.id
}

output "country_to_sms_cost_map" {
  value = local.country_to_sms_cost_map
}
