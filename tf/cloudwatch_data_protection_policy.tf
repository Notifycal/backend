resource "aws_cloudwatch_log_data_protection_policy" "no_credentials_in_logs" {
  for_each = var.enable_data_protection ? local.all_lambdas : {}

  log_group_name = each.value["lambda_cloudwatch_log_group_name"]

  # This is the format AWS expects, with an Operation.Audit and an Operation.Deidentify
  # even if you're only using one of them
  policy_document = jsonencode({
    Name    = "MaskCredentials"
    Version = "2021-06-01"

    Statement = [
      {
        Sid = "Audit",
        DataIdentifier = [
          "arn:aws:dataprotection::aws:data-identifier/AwsSecretKey",
          "arn:aws:dataprotection::aws:data-identifier/OpenSshPrivateKey",
          "arn:aws:dataprotection::aws:data-identifier/PgpPrivateKey",
          "arn:aws:dataprotection::aws:data-identifier/PkcsPrivateKey",
          "arn:aws:dataprotection::aws:data-identifier/PuttyPrivateKey",
          "BeginEndGeneric"
        ],
        Operation = {
          Audit = {
            FindingsDestination = {}
          }
        }
      },
      {
        Sid = "Redact"
        DataIdentifier = [
          "arn:aws:dataprotection::aws:data-identifier/AwsSecretKey",
          "arn:aws:dataprotection::aws:data-identifier/OpenSshPrivateKey",
          "arn:aws:dataprotection::aws:data-identifier/PgpPrivateKey",
          "arn:aws:dataprotection::aws:data-identifier/PkcsPrivateKey",
          "arn:aws:dataprotection::aws:data-identifier/PuttyPrivateKey",
          "BeginEndGeneric"
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
          Name  = "BeginEndGeneric",
          Regex = "-{5}BEGIN[A-Z ]+-{5}(?:\\\\.|[^\"])*?-{5}END[A-Z ]+-{5}\\\\n?"
        }
      ]
    }
  })
}
