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
    weekly_during_pitr_days = number
    weekly_post_pitr_days   = number
    monthly_retention_days  = number
    cold_storage_after_days = number
    weekly_cron             = string
    monthly_cron            = string
  })
}

variable "environment" {
  description = "Environment name"
  type        = string
}
