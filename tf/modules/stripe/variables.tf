variable "environment" {
  type = string
}

variable "subscription_tiers" {
  description = "Configuration for subscription tiers. Eg: Good, Better, Best"
  type = map(object({
    name        = string
    description = string
    price_cents = number # Price in cents (e.g., 1000 = €10.00)
  }))
}

variable "currency" {
  description = "Currency code for payments"
  type        = string
  default     = "eur"
}

variable "spain_vat_percentage" {
  description = "Spanish VAT percentage"
  type        = number
  default     = 21.0
}
