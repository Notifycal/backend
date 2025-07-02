variable "environment" {
  type = string
}

variable "subscription_tiers" {
  description = "Configuration for subscription tiers. Eg: Good, Better, Best"
  type = map(object({
    name        = string
    description = string
    price_cents = number # Price in cents (e.g., 1000 = €10.00)
    credits     = number
  }))
}

variable "topups" {
  description = "Configuration for topups. Eg: x100"
  type = map(object({
    name        = string
    description = string
    price_cents = number # Price in cents (e.g., 1000 = €10.00)
    credits     = number
  }))
}

variable "country_to_sms_cost_map" {
  type = map(number)
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
