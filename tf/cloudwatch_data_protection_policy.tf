locals {
  lambda_cloudwatch_log_group_names = {

    get_idp_user_calendars               = module.get_idp_user_calendars_lambda.lambda_cloudwatch_log_group_name,
    get_user_profile                     = module.get_user_profile_lambda.lambda_cloudwatch_log_group_name,
    patch_user_profile                   = module.patch_user_profile_lambda.lambda_cloudwatch_log_group_name,
    post_login                           = module.post_login_lambda.lambda_cloudwatch_log_group_name,
    post_refresh                         = module.post_refresh_lambda.lambda_cloudwatch_log_group_name,
    event_reminder_status_change_webhook = module.event_reminder_status_change_webhook_lambda.lambda_cloudwatch_log_group_name,
    fetch_user_calendars                 = module.fetch_user_calendars_lambda.lambda_cloudwatch_log_group_name,
    audit_trail                          = module.audit_trail_lambda.lambda_cloudwatch_log_group_name,
    find_actionable_events               = module.find_actionable_events_lambda.lambda_cloudwatch_log_group_name,
    send_event_reminder                  = module.send_event_reminder_lambda.lambda_cloudwatch_log_group_name
    # TODO: Add new lambdas here
  }
}

resource "aws_cloudwatch_log_data_protection_policy" "no_credentials_in_logs" {
  for_each = local.lambda_cloudwatch_log_group_names

  log_group_name = each.value

  policy_document = jsonencode({
    Name    = "MaskCredentials"
    Version = "2021-06-01"

    Statement = [
      {
        Sid = "Redact"
        DataIdentifier = [
          "arn:aws:dataprotection::aws:data-identifier/AwsSecretKey",
          "arn:aws:dataprotection::aws:data-identifier/OpenSshPrivateKey",
          "arn:aws:dataprotection::aws:data-identifier/PgpPrivateKey",
          "arn:aws:dataprotection::aws:data-identifier/PkcsPrivateKey",
          "arn:aws:dataprotection::aws:data-identifier/PuttyPrivateKey"

        ]
        Operation = {
          Deidentify = {
            MaskConfig = {}
          }
        }
      }
    ]

    Configuration = {
      CustomDataIdentifier = [
        {
          Name  = "PrivatekeyGeneric",
          Regex = "-{5}BEGIN PRIVATE KEY-{5}.*-{5}END PRIVATE KEY-{5}"
        }
      ]
    }
  })
}
