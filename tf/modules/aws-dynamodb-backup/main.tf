locals {
  resource_prefix = var.table_name
}

resource "aws_backup_vault" "dynamodb_vault" {
  name          = "${local.resource_prefix}-vault"
  force_destroy = !var.deletion_protection_enabled
}

resource "aws_backup_plan" "tiers" {
  for_each = { for tier in var.backup_config.backup_tiers : tier.name => tier }

  name = "${local.resource_prefix}-${each.key}"

  rule {
    rule_name         = each.value.rule_name != null ? each.value.rule_name : title(each.key)
    target_vault_name = aws_backup_vault.dynamodb_vault.name
    schedule          = each.value.frequency_cron

    lifecycle {
      delete_after                              = each.value.retention_days
      cold_storage_after                        = each.value.cold_storage_days
      opt_in_to_archive_for_supported_resources = each.value.cold_storage_days != null
    }

    recovery_point_tags = {
      Environment = var.environment
      Table       = var.table_name
      BackupTier  = each.key
    }
  }
}

resource "aws_backup_selection" "tiers" {
  for_each = { for tier in var.backup_config.backup_tiers : tier.name => tier }

  iam_role_arn = aws_iam_role.backup_role.arn
  name         = "${local.resource_prefix}-${each.key}-sel"
  plan_id      = aws_backup_plan.tiers[each.key].id

  resources = [var.table_arn]
}