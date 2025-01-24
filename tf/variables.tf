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

variable "lambdas_tracing_mode" {
  type    = string
  default = "Active"
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
}
