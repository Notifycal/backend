data "aws_iam_policy_document" "xray_sns_policydoc" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["sns.amazonaws.com"]
    }

    actions = [
      "xray:PutTraceSegments",
      "xray:GetSamplingRules",
      "xray:GetSamplingTargets"
    ]

    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [local.aws_account_id]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceArn"
      values = [
        # Add new topics here
        module.actionable_event_found_topic.sns_topic_arn,
        module.user_calendar_fetched_topic.sns_topic_arn
      ]
    }
  }
}

resource "local_file" "xray_policy_tmp_file" {
  content  = data.aws_iam_policy_document.xray_sns_policydoc.json
  filename = "/tmp/${var.environment}-tracing.json"
}

resource "null_resource" "put_xray_sns_resource_policy" {
  depends_on = [local_file.xray_policy_tmp_file]

  provisioner "local-exec" {
    command = <<EOT
      aws xray put-resource-policy \
        --policy-name "${var.environment}-sns-tracing" \
        --policy-document file:///tmp/${var.environment}-tracing.json
    EOT
  }

  triggers = {
    policy_hash = md5(jsonencode(data.aws_iam_policy_document.xray_sns_policydoc.json))
  }
}
