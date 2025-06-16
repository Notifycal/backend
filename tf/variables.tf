variable "app_version" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "api_stage_name" {
  type = string
}

variable "openapi_spec_file" {
  type        = string
  description = "Name of the OpenAPI spec file for this API"
  default     = "spec.yaml"
}

variable "environment" {
  type = string
}

variable "frontend_domain" {
  type        = string
  description = "Allowed domain specified in response headers by API gateway lambdas(TLDR: CORS)"
}

variable "base_domain" {
  type    = string
  default = "notifycal.com"
}

variable "domain_prefix" {
  type    = string
  default = "api"
}

variable "lambdas_live_alias_name" {
  type    = string
  default = "live"
}

variable "lambdas_logging_log_format" {
  type    = string
  default = "JSON"
}

variable "lambdas_runtime" {
  type    = string
  default = "nodejs22.x"
}

variable "lambdas_handler_name" {
  type    = string
  default = "index.handler"
}

variable "api_gateway_custom_domain_enabled" {
  type        = bool
  default     = true
  description = "Controls the creation of a custom domain for API Gateway and the domain it is accessible from"
}

variable "google_oauth_config" {
  type = object({
    client_id         = string
    client_secret     = string
    redirect_url_list = list(string)
  })
  sensitive = true
}

variable "vonage_auth_config" {
  type = object({
    api_key                    = string
    application_id             = string
    private_key_secret_path    = string
    webhook_jwt_signing_secret = string
  })
  sensitive = true
}

variable "messaging_config" {
  type = object({
    enabled = bool
  })
  default = {
    enabled = true
  }
}

variable "mailgun_auth" {
  type = object({
    api_key = string
  })
  sensitive = true
}

variable "mailgun_config" {
  type = object({
    base_url    = string
    domain_name = string
  })
}

variable "emailing_config" {
  type = object({
    enabled = bool
    sender = object({
      displayName = optional(string, "Notifycal")
      email       = string
    })
  })
  default = {
    enabled = true
    sender = {
      displayName = "Notifycal"
      email       = "info@notifycal.com"
    }
  }
}

variable "jwt_config" {
  type = object({
    access = object({
      algorithm  = string
      audience   = string
      expiration = string
      issuer     = string
    })
    refresh = object({
      algorithm  = string
      audience   = string
      expiration = string
      issuer     = string
    })
  })

  validation {
    condition = (
      substr(var.jwt_config.access.algorithm, 0, 2) == "ES" &&
      substr(var.jwt_config.refresh.algorithm, 0, 2) == "ES" &&
      contains(["224", "256", "384", "521"], substr(var.jwt_config.access.algorithm, 2, -1)) &&
      contains(["224", "256", "384", "521"], substr(var.jwt_config.refresh.algorithm, 2, -1))
    )
    error_message = "The algorithm for both access and refresh tokens must be: ES224, ES256, ES384 or ES521"
  }
}

variable "jwt_keys" {
  type = object({
    access = object({
      public_key  = string
      private_key = string
    })
    refresh = object({
      public_key  = string
      private_key = string
    })
  })
  sensitive = true
}

variable "enable_xray_active_tracing" {
  type    = bool
  default = true
}

variable "observability" {
  type = object({
    alert_notifier = object({
      slack_channel = string
    })
    alert_config = optional(object({
      treat_missing_data       = optional(string, "missing")
      notify_insufficient_data = optional(bool, true)
      }), {
      treat_missing_data       = "missing"
      notify_insufficient_data = true
    })
  })
}


variable "vendor_alarm_config" {
  description = "Configuration for each integration vendor's error rate alarm"
  type = object({
    Vonage = object({
      error_rate_threshold      = number
      evaluation_period_seconds = number
      datapoints_to_alarm       = number
      evaluation_periods        = number
    })
    Mailgun = object({
      error_rate_threshold      = number
      evaluation_period_seconds = number
      datapoints_to_alarm       = number
      evaluation_periods        = number
    })
    Google = object({
      error_rate_threshold      = number
      evaluation_period_seconds = number
      datapoints_to_alarm       = number
      evaluation_periods        = number
    })
  })
  default = {
    Vonage = {
      error_rate_threshold      = 2
      evaluation_period_seconds = 3600
      datapoints_to_alarm       = 1
      evaluation_periods        = 1
    },
    Mailgun = {
      error_rate_threshold      = 5
      evaluation_period_seconds = 3600
      datapoints_to_alarm       = 1
      evaluation_periods        = 1
    },
    Google = {
      error_rate_threshold      = 2
      evaluation_period_seconds = 3600
      datapoints_to_alarm       = 1
      evaluation_periods        = 1
    }
  }
}

variable "enable_data_protection" {
  type    = bool
  default = true
}

variable "deletion_protection_enabled" {
  type    = bool
  default = true
}

variable "alert_for_missing_phone_number" {
  type = object({
    error_rate_threshold              = optional(number, 5)
    max_notifications_per_day         = optional(number, 1)
    count_threshold_to_enable_trigger = optional(number, 0)
  })
  default = {}
}

variable "subscription_tiers" {
  description = "Configuration for subscription tiers. E.g.: Good, Better, Best"
  type = map(object({
    price_id = string
    name     = string
  }))
}

variable "stripe_operating_api_key" {
  description = "Stripe operating API key"
  type        = string
  sensitive   = true
}
variable "stripe_admin_api_key" {
  description = "Stripe admin API key"
  type        = string
  sensitive   = true
}

variable "stripe_api_version" {
  type    = string
  default = "2025-05-28.basil"
}

