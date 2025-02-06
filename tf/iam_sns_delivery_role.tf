data "aws_iam_policy_document" "sns_feedback_policydoc" {
  statement {
    sid    = "SnsAssume"
    effect = "Allow"

    actions = [
      "sts:AssumeRole",
      "sts:TagSession",
    ]

    principals {
      type        = "Service"
      identifiers = ["sns.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "sns_feedback_role" {
  name               = "sns-delivery-feedback-role"
  assume_role_policy = data.aws_iam_policy_document.sns_feedback_policydoc.json

  tags = local.common_tags
}
