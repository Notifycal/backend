# unique suffix to be able to deploy multiple copies of this stack
resource "random_id" "suffix" {
  byte_length = 3
}

locals {
  suffix = "${var.environment}-${random_id.suffix.hex}"
}

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

variable "suffix" {
  description = "Suffix to use when naming resources in this module."
  type        = string
}


