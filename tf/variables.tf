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
    client_id     = string
    client_secret = string
    redirect_url  = string
  })
  sensitive = true
}

variable "jwt_config" {
  type = object({
    access = object({
      algorithm  = optional(string, "ES256")
      audience   = optional(string, "notifycal.com")
      expiration = optional(string, "5m")
      issuer     = optional(string, "notifycal.com")
    })
    refresh = object({
      algorithm  = optional(string, "ES256")
      audience   = optional(string, "notifycal.com")
      expiration = optional(string, "7d")
      issuer     = optional(string, "notifycal.com")
    })
  })
  default = {
    access  = {}
    refresh = {}
  }

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

variable "enable_xray_active_tracing" {
  type    = bool
  default = true
}

variable "observability" {
  type = optional(object({
    slack_webhook_url = string
    slack_channel = string
  }))
}