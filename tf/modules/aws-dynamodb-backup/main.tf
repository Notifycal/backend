locals {
  resource_prefix = var.table_name
}

resource "aws_backup_vault" "dynamodb_vault" {
  name        = "${local.resource_prefix}-vault"
  kms_key_arn = aws_kms_key.backup_key.arn
}

resource "aws_kms_key" "backup_key" {
  description             = "KMS key for DynamoDB backup vault ${var.table_name} in ${var.environment}"
  deletion_window_in_days = 7

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableIAMUserPermissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowBackupServiceAccess"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey",
          "kms:Encrypt",
          "kms:GenerateDataKey*",
          "kms:ReEncrypt*"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_kms_alias" "backup_key_alias" {
  name          = "alias/${local.resource_prefix}-backup-key"
  target_key_id = aws_kms_key.backup_key.key_id
}

data "aws_caller_identity" "current" {}

resource "aws_backup_plan" "tiers" {
  for_each = { for tier in var.backup_config.backup_tiers : tier.name => tier }

  name = "${local.resource_prefix}-${each.key}"

  rule {
    rule_name         = each.value.rule_name != null ? each.value.rule_name : title(each.key)
    target_vault_name = aws_backup_vault.dynamodb_vault.name
    schedule          = each.value.frequency_cron

    lifecycle {
      delete_after       = each.value.retention_days
      cold_storage_after = each.value.cold_storage_days
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