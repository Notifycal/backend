data "aws_caller_identity" "current" {}

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
      values   = [data.aws_caller_identity.current.account_id]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceArn"
      values   = [aws_sns_topic.topic.arn]
    }
  }
}

resource "local_file" "xray_policy_tmp_file" {
  content  = data.aws_iam_policy_document.xray_sns_policydoc.json
  filename = "/tmp/${local.topic_name}-xray-tracing.json"
}

resource "null_resource" "put_xray_sns_resource_policy" {
  depends_on = [local_file.xray_policy_tmp_file]

  provisioner "local-exec" {
    command = <<EOT
      aws xray put-resource-policy \
        --policy-name "${local.topic_name}-xray-tracing" \
        --policy-document file:///tmp/${local.topic_name}-xray-tracing.json
    EOT
  }

  triggers = {
    policy_hash = md5(jsonencode(data.aws_iam_policy_document.xray_sns_policydoc.json))
  }
}
