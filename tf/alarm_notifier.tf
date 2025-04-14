data "aws_ssm_parameter" "slack_bot_token" {
  name = "/providers/slack/botsecops/slack_token"
}

module "notify_slack" {
  source = "git@github.com:Notifycal/tofu-module-aws-slack-notify.git?ref=work-with-bot-post-message"

  count = local.observability_count

  sns_topic_name = "${var.environment}-alarms"

  slack_channel   = var.observability.slack_channel
  slack_bot_token = data.aws_ssm_parameter.slack_bot_token.value

  lambda_function_name = "notify-slack-${var.environment}"
  lambda_description   = "Lambda function which sends alert notifications to Slack"
  log_events           = true

  tags = merge({}, local.common_tags)
}
