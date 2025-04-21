data "aws_ssm_parameter" "slack_bot_token" {
  count = local.observability_count
  name  = "/providers/slack/botsecops/slack_token"
}

module "notify_slack" {
  source = "git@github.com:Notifycal/tofu-module-aws-slack-notify.git?ref=v7.0.1"

  count = local.observability_count

  sns_topic_name = "${var.environment}-alarms"

  slack_channel   = var.observability.alert_notifier.slack_channel
  slack_bot_token = data.aws_ssm_parameter.slack_bot_token[0].value

  lambda_function_name = "notify-slack-${var.environment}"
  lambda_description   = "Lambda function which sends alert notifications to Slack"
  log_events           = true

  tags = merge({}, local.common_tags)
}
