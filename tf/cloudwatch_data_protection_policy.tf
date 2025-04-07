locals {
  lambda_cloudwatch_log_group_names = {
    send_event_reminder = module.send_event_reminder_lambda.lambda_cloudwatch_log_group_name

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
