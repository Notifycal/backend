locals {
  users_table_name      = "Users-${var.environment}"
  live_users_index_name = "Live${local.users_table_name}"
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

  # DROP THIS BEFORE MERGING: https://github.com/hashicorp/terraform-provider-aws/issues/41110
  lifecycle {
    ignore_changes = [
      global_secondary_index
    ]
  }

  deletion_protection_enabled = true
}
