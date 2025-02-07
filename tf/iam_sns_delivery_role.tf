data "aws_iam_policy_document" "sns_feedback_assume_role_policydoc" {
  statement {
    sid    = "SnsAssume"
    effect = "Allow"

    actions = [
      "sts:AssumeRole",
    ]

    principals {
      type        = "Service"
      identifiers = ["sns.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "sns_feedback_policydoc" {
  statement {
    sid    = "SnsAssume"
    effect = "Allow"

    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:PutMetricFilter",
      "logs:PutRetentionPolicy"
    ]

    resources = [
      "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:*"
    ]
  }
}

resource "aws_iam_role" "sns_feedback_role" {
  name               = "sns-delivery-feedback-role"
  assume_role_policy = data.aws_iam_policy_document.sns_feedback_assume_role_policydoc.json

  inline_policy {
    name   = "write-access-cw-logs-for-sns"
    policy = data.aws_iam_policy_document.sns_feedback_policydoc.json
  }

  tags = local.common_tags
}
