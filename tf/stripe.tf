module "stripe" {
  source               = "./modules/stripe"
  subscription_tiers   = var.subscription_tiers
  currency             = var.currency
  spain_vat_percentage = var.spain_vat_percentage
}
