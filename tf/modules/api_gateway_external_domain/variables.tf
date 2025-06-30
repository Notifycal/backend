variable "base_domain" {
  type    = string
  default = "notifycal.com"
}

variable "domain_prefix" {
  type    = string
  default = "api"
}

variable "domain_ttl" {
  type = number

  validation {
    condition     = var.domain_ttl >= 60 && var.domain_ttl <= 86400
    error_message = "TTL must be within 60 seconds and 1 day."
  }
}

variable "rest_api_id" {
  type = string
}

variable "stage_name" {
  type = string
}
