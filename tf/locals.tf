locals {
  backup_enabled      = var.backup_config != null
  pitr_enabled        = local.backup_enabled && (var.backup_config != null ? var.backup_config.pitr_enabled : false)
  pitr_retention_days = local.backup_enabled && var.backup_config != null ? var.backup_config.pitr_retention_days : null
}
