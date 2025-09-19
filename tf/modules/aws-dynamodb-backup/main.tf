locals {
  resource_prefix = "dynamodb-backup-${var.table_name}-${var.environment}"
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

resource "aws_backup_plan" "weekly_during_pitr" {
  name = "${local.resource_prefix}-weekly-during-pitr"

  rule {
    rule_name         = "WeeklyDuringPITR"
    target_vault_name = aws_backup_vault.dynamodb_vault.name
    schedule          = var.backup_config.weekly_cron

    lifecycle {
      cold_storage_after                        = var.backup_config.cold_storage_after_days
      delete_after                              = var.backup_config.weekly_during_pitr_days
      opt_in_to_archive_for_supported_resources = true
    }

    recovery_point_tags = {
      Environment = var.environment
      Table       = var.table_name
      BackupType  = "WeeklyDuringPITR"
    }
  }

}

resource "aws_backup_plan" "weekly_post_pitr" {
  name = "${local.resource_prefix}-weekly-post-pitr"

  rule {
    rule_name         = "WeeklyPostPITR"
    target_vault_name = aws_backup_vault.dynamodb_vault.name
    schedule          = var.backup_config.weekly_cron

    lifecycle {
      cold_storage_after                        = var.backup_config.cold_storage_after_days
      delete_after                              = var.backup_config.weekly_post_pitr_days
      opt_in_to_archive_for_supported_resources = true
    }

    recovery_point_tags = {
      Environment = var.environment
      Table       = var.table_name
      BackupType  = "WeeklyPostPITR"
    }
  }

}

resource "aws_backup_plan" "monthly" {
  name = "${local.resource_prefix}-monthly"

  rule {
    rule_name         = "Monthly"
    target_vault_name = aws_backup_vault.dynamodb_vault.name
    schedule          = var.backup_config.monthly_cron

    lifecycle {
      cold_storage_after                        = var.backup_config.cold_storage_after_days
      delete_after                              = var.backup_config.monthly_retention_days
      opt_in_to_archive_for_supported_resources = true
    }

    recovery_point_tags = {
      Environment = var.environment
      Table       = var.table_name
      BackupType  = "Monthly"
    }
  }

}

resource "aws_backup_selection" "weekly_during_pitr" {
  iam_role_arn = aws_iam_role.backup_role.arn
  name         = "${local.resource_prefix}-weekly-during-pitr-selection"
  plan_id      = aws_backup_plan.weekly_during_pitr.id

  resources = [var.table_arn]
}

resource "aws_backup_selection" "weekly_post_pitr" {
  iam_role_arn = aws_iam_role.backup_role.arn
  name         = "${local.resource_prefix}-weekly-post-pitr-selection"
  plan_id      = aws_backup_plan.weekly_post_pitr.id

  resources = [var.table_arn]
}

resource "aws_backup_selection" "monthly" {
  iam_role_arn = aws_iam_role.backup_role.arn
  name         = "${local.resource_prefix}-monthly-selection"
  plan_id      = aws_backup_plan.monthly.id

  resources = [var.table_arn]
}