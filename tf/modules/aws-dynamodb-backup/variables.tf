variable "table_arn" {
  description = "ARN of the DynamoDB table to backup"
  type        = string
}

variable "table_name" {
  description = "Friendly name for the table (used in resource naming)"
  type        = string
}

variable "backup_config" {
  description = "Backup configuration for the DynamoDB table"
  type = object({
    pitr_enabled        = bool
    pitr_retention_days = number
    backup_tiers = list(object({
      name              = string
      rule_name         = optional(string)
      frequency_cron    = string
      retention_days    = number
      cold_storage_days = optional(number)
      description       = optional(string)
    }))
  })
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "deletion_protection_enabled" {
  type        = bool
  default     = true
  description = "Whether to prevent deletion of backup vault when it contains recovery points"
}