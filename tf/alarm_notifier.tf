module "notify_slack" {
  source  = "terraform-aws-modules/notify-slack/aws"
  version = "~> 5.0"
  count   = local.observability_count

  sns_topic_name = "${var.environment}-alarms"

  slack_webhook_url = var.observability.slack_webhook_url
  slack_channel     = var.observability.slack_channel
  slack_username    = "reporter"

  lambda_function_name = "notify_slack_${var.environment}"
  lambda_description   = "Lambda function which sends notifications to Slack"
  log_events           = true

  tags = merge({}, local.common_tags)
}
