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
  type        = string
}
