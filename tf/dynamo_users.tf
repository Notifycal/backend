locals {
  users_table_name         = "Users-${var.environment}"
  live_users_index_name    = "Live${local.users_table_name}"
  payment_users_index_name = "Payment${local.users_table_name}"
}

resource "aws_dynamodb_table" "users" {
  name = local.users_table_name
  # TODO: Maybe change it to PROVISIONED in the future when the workloads are clear(er)
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "UserId"

  attribute {
    name = "UserId"
    type = "S"
  }

  attribute {
    name = "UserStatus"
    type = "S"
  }

  attribute {
    name = "StripeCustomerId"
    type = "S"
  }

  global_secondary_index {
    name            = local.live_users_index_name
    hash_key        = "UserStatus"
    range_key       = "UserId"
    projection_type = "INCLUDE"

    # Key attributes (from index and table) are included by default
    non_key_attributes = [
      "Config",
      "Email",
      "Idp",
      "IdpId",
      "IdpAuthorization"
    ]
  }

  global_secondary_index {
    name            = local.payment_users_index_name
    hash_key        = "StripeCustomerId"
    range_key       = "UserId"
    projection_type = "INCLUDE"

    # Key attributes (from index and table) are included by default
    non_key_attributes = [
      "Email",
      "Idp",
      "IdpId",
    ]
  }

  deletion_protection_enabled = var.deletion_protection_enabled

  point_in_time_recovery {
    enabled                 = local.backup_enabled && var.backup_config.pitr_enabled
    recovery_period_in_days = local.backup_enabled ? var.backup_config.pitr_retention_days : null
  }
}

module "users_backup" {
  count  = local.backup_enabled ? 1 : 0
  source = "./modules/aws-dynamodb-backup"

  table_arn                   = aws_dynamodb_table.users.arn
  table_name                  = local.users_table_name
  backup_config               = var.backup_config
  environment                 = var.environment
  deletion_protection_enabled = var.deletion_protection_enabled
}
