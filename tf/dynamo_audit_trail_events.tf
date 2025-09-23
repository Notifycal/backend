locals {
  audit_trail_table_name = "AuditTrailEvents-${var.environment}"
}

resource "aws_dynamodb_table" "audit_trail_events" {
  name         = "AuditTrailEvents-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "EventId"

  attribute {
    name = "EventId"
    type = "S"
  }
  ttl {
    attribute_name = "ExpiresAt"
    enabled        = true
  }

  deletion_protection_enabled = var.deletion_protection_enabled

  stream_enabled   = true
  stream_view_type = "NEW_IMAGE"

  point_in_time_recovery {
    enabled                 = local.backup_enabled && var.backup_config.pitr_enabled
    recovery_period_in_days = local.backup_enabled ? var.backup_config.pitr_retention_days : null
  }
}

module "audit_trail_backup" {
  count  = local.backup_enabled ? 1 : 0
  source = "./modules/aws-dynamodb-backup"

  table_arn                   = aws_dynamodb_table.audit_trail_events.arn
  table_name                  = local.audit_trail_table_name
  backup_config               = var.backup_config
  environment                 = var.environment
  deletion_protection_enabled = var.deletion_protection_enabled
}