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

resource "awscc_xray_resource_policy" "xray_sns_resource_policy" {
  count                       = var.enable_xray_active_tracing ? 1 : 0
  bypass_policy_lockout_check = false
  policy_document             = data.aws_iam_policy_document.xray_sns_policydoc.json
  policy_name                 = "${var.environment}-sns-tracing"
}
