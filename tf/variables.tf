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

variable "allowed_origins" {
  type        = list(string)
  description = "Allowed origins specified in response headers by API gateway lambdas(TLDR: CORS). The value matching the request header origin will be set in the response"
}

variable "base_domain" {
  type    = string
  default = "notifycal.com"
}

variable "frontend_url" {
  type    = string
  default = "https://private.notifycal.com"
}

variable "domain_prefix" {
  type    = string
  default = "api"
}

variable "lambdas_live_alias_name" {
  type    = string
  default = "live"
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

variable "api_gateway_custom_domain_ttl" {
  type        = number
  default     = 300
  description = "TTL for the custom DNS record for API Gateway."
}

variable "disable_execute_api_endpoint" {
  type        = bool
  default     = true
  description = "Controls whether the API Gateway will be accessible through the AWS-generated URL when var.api_gateway_custom_domain_enabled is set to true."
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

variable "payment_plans" {
  description = "Configuration for subscription tiers. E.g.: Good, Better, Best and topups E.g.: x100"
  type = object({
    tiers = map(object({
      price_id = string
      name     = string
      credits  = number
    }))
    topups = map(object({
      price_id = string
      name     = string
      credits  = number
    }))
  })
}

variable "country_to_sms_cost_map" {
  type = map(number)
}


variable "tax_id" {
  description = "ID to reference to tax resource in Stripe. Typically, it will be a tax id that involves adding 21% of VAT (Spanish IVA)"
  type        = string
}

variable "customer_portal_configuration_id" {
  description = "ID to reference the customer portal configuration"
  type        = string
}

variable "stripe_operating_api_key" {
  description = "Stripe operating API key. See stripe.README.md"
  type        = string
  sensitive   = true
}
variable "stripe_admin_api_key" {
  description = "Stripe admin API key. See stripe.README.md"
  type        = string
  sensitive   = true
}

variable "stripe_api_version" {
  type    = string
  default = "2025-05-28.basil"
}

variable "stripe_admin_webhook_url" {
  description = "Endpoint URL for Stripe to send admin-level updates such us new customer, disputes open, etc.. Typically, it will be the Stripe Slack App. It requires a manual step: check out https://notifycal.slack.com/marketplace/A0F81FNVC-stripe"
  type        = string
  sensitive   = true
  default     = null
}

locals {
  aws_log_group_retention_values = [
    1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653
  ]
  log_retention_validation_message = "must be one of the AWS CloudWatch supported values: ${join(", ", local.aws_log_group_retention_values)}"
  aws_logging_format_values        = ["JSON", "Text"]
}

variable "lambda_logging" {
  description = "Lambda logging configuration. Log retention default value matches what the privacy policy states."
  type = object({
    retention_in_days = optional(number, 180)
    format            = optional(string, "JSON")
  })
  default = {
    retention_in_days = 180
  }

  validation {
    condition     = contains(local.aws_log_group_retention_values, var.lambda_logging.retention_in_days)
    error_message = "lambda logs retention_in_days ${local.log_retention_validation_message}"
  }

  validation {
    condition     = contains(local.aws_logging_format_values, var.lambda_logging.format)
    error_message = "lambda logging format must be one of these values: ${join(", ", local.aws_logging_format_values)}"
  }
}

variable "api_gateway_logging" {
  description = "API Gateway logging configuration. Log retention default value matches what the privacy policy states."
  type = object({
    data_trace_enabled       = optional(bool, false)
    logging_level            = optional(string, "ERROR")
    execution_logs_retention = optional(number, 180)
    access_logs_retention    = optional(number, 180)
  })
  default = {
    data_trace_enabled       = false
    logging_level            = "ERROR"
    execution_logs_retention = 180
    access_logs_retention    = 180
  }

  validation {
    condition     = contains(["ERROR", "INFO", "OFF"], var.api_gateway_logging.logging_level)
    error_message = "logging_level must be one of: ERROR, INFO, OFF"
  }

  validation {
    condition     = contains(local.aws_log_group_retention_values, var.api_gateway_logging.execution_logs_retention)
    error_message = "execution_logs_retention ${local.log_retention_validation_message}"
  }

  validation {
    condition     = contains(local.aws_log_group_retention_values, var.api_gateway_logging.access_logs_retention)
    error_message = "access_logs_retention ${local.log_retention_validation_message}"
  }
}

variable "backup_config" {
  description = <<-EOT
    DynamoDB backup configuration with flexible tier strategy.
    Each tier defines frequency, retention, and storage class.
    Includes validations for AWS Backup restrictions.

    Default implements 2-tier strategy:
    - Days 0-35: PITR active
    - Days 35-105: Weekly backups (warm storage only)
    - Days 105-180: Monthly backups (cold storage after 14 days)
    - Day 180: Automatic deletion (GDPR compliance)
  EOT

  type = object({
    pitr_enabled        = optional(bool, true)
    pitr_retention_days = optional(number, 35)
    backup_tiers = optional(list(object({
      name              = string
      rule_name         = optional(string)
      frequency_cron    = string
      retention_days    = number
      cold_storage_days = optional(number)
      description       = optional(string)
      })), [
      {
        name              = "weekly"
        rule_name         = "Weekly"
        frequency_cron    = "cron(0 6 ? * MON-FRI)"
        retention_days    = 105
        cold_storage_days = null
        description       = "Weekly backups for short-term retention"
      },
      {
        name              = "monthly"
        rule_name         = "Monthly"
        frequency_cron    = "cron(0 6 1 * ? *)"
        retention_days    = 180
        cold_storage_days = 14
        description       = "Monthly backups with cold storage for long-term retention"
      }
    ])
  })
  default = {}

  validation {
    condition = var.backup_config == null ? true : alltrue([
      for tier in var.backup_config.backup_tiers :
      tier.cold_storage_days == null ? true : tier.retention_days >= (tier.cold_storage_days + 90)
    ])
    error_message = "AWS requires minimum 90 days between cold storage and deletion. Each tier with cold_storage_days must have retention_days >= (cold_storage_days + 90)."
  }


  validation {
    condition     = var.backup_config == null ? true : (var.backup_config.pitr_retention_days >= 1 && var.backup_config.pitr_retention_days <= 35)
    error_message = "PITR retention must be between 1 and 35 days (AWS DynamoDB limit)."
  }

  validation {
    condition     = var.backup_config == null ? true : length(distinct([for tier in var.backup_config.backup_tiers : tier.name])) == length(var.backup_config.backup_tiers)
    error_message = "Backup tier names must be unique within the configuration."
  }
}
