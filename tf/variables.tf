variable "aws_region" {
  type = string
}

variable "api_stage_name" {
  type = string
}

variable "openapi_spec_file" {
  type        = string
  description = "Path to the OpenAPI spec file for this API"
  default     = "../openapi/spec.yaml"
}

variable "resource_suffix" {
  description = "Suffix to use when naming resources in this module."
  type        = string
}
