locals {
  alarm_actions             = [module.notify_slack.slack_topic_arn]
  ok_actions                = [module.notify_slack.slack_topic_arn]
  insufficient_data_actions = [module.notify_slack.slack_topic_arn]
  observability_count       = can(var.observability) ? 1 : 0
}

resource "aws_cloudwatch_metric_alarm" "lambda_concurrent_executions" {
  count = local.observability_count
  # Intent            : "This alarm can proactively detect if the concurrency of the function is approaching the Region-level concurrency quota of your account, so that you can act on it. A function is throttled if it reaches the Region-level concurrency quota of the account."
  # Threshold Justification : "Set the threshold to about 90% of the concurrency quota set for the account in the Region. By default, your account has a concurrency quota of 1,000 across all functions in a Region. However, you can check the quota of your account, as it can be increased by contacting AWS support."
  alarm_name                = "AWS/Lambda ConcurrentExecutions"
  alarm_description         = "This alarm helps to monitor if the concurrency of the function is approaching the Region-level concurrency limit of your account. A function starts to be throttled if it reaches the concurrency limit. You can take the following actions to avoid throttling. 1) Request a concurrency increase from AWS Support in this Region. 2) Identify performance issues in the function to improve the speed of processing and therefore improve throughput. 3) Increase the batch size of the function, so that more messages are processed by each function invocation. To get better visibility on reserved concurrency and provisioned concurrency utilization, set an alarm on the new metric ClaimedAccountConcurrency instead."
  actions_enabled           = true
  ok_actions                = [local.alarm_actions]
  alarm_actions             = [local.alarm_actions]
  insufficient_data_actions = [local.alarm_actions]
  metric_name               = "ConcurrentExecutions"
  namespace                 = "AWS/Lambda"
  statistic                 = "Maximum"
  period                    = 60
  dimensions                = {}
  evaluation_periods        = 10
  datapoints_to_alarm       = 10
  threshold                 = 2
  comparison_operator       = "GreaterThanThreshold"
  treat_missing_data        = "missing"
}

resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  count = local.observability_count
  # Intent            : "This alarm can detect a long running duration of a Lambda function. High runtime duration indicates that a function is taking a longer time for invocation, and can also impact the concurrency capacity of invocation if Lambda is handling a higher number of events. It is critical to know if the Lambda function is constantly taking longer execution time than expected."
  # Threshold Justification : "The threshold for the duration depends on your application and workloads and your performance requirements. For high-performance requirements, set the threshold to a shorter time to see if the function is meeting expectations. You can also analyze historical data for duration metrics to see the if the time taken matches the performance expectation of the function, and then set the threshold to a longer time than the historical average. Make sure to set the threshold lower than the configured function timeout."
  alarm_name                = "AWS/Lambda Duration"
  alarm_description         = "This alarm detects long duration times for processing an event by a Lambda function. Long durations might be because of changes in function code making the function take longer to execute, or the function's dependencies taking longer."
  actions_enabled           = true
  ok_actions                = [local.alarm_actions]
  alarm_actions             = [local.alarm_actions]
  insufficient_data_actions = [local.alarm_actions]
  metric_name               = "Duration"
  namespace                 = "AWS/Lambda"
  extended_statistic        = "p90"
  period                    = 60
  dimensions                = {}
  evaluation_periods        = 15
  datapoints_to_alarm       = 15
  threshold                 = 5
  comparison_operator       = "GreaterThanThreshold"
  treat_missing_data        = "missing"
}

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  count = local.observability_count
  # Intent            : "The alarm helps detect high error counts in function invocations."
  # Threshold Justification : "Set the threshold to a number greater than zero. The exact value can depend on the tolerance for errors in your application. Understand the criticality of the invocations that the function is handling. For some applications, any error might be unacceptable, while other applications might allow for a certain margin of error."
  alarm_name                = "AWS/Lambda Errors"
  alarm_description         = "This alarm detects high error counts. Errors includes the exceptions thrown by the code as well as exceptions thrown by the Lambda runtime. You can check the logs related to the function to diagnose the issue."
  actions_enabled           = true
  ok_actions                = [local.alarm_actions]
  alarm_actions             = [local.alarm_actions]
  insufficient_data_actions = [local.alarm_actions]
  metric_name               = "Errors"
  namespace                 = "AWS/Lambda"
  statistic                 = "Sum"
  period                    = 60
  dimensions                = {}
  evaluation_periods        = 3
  datapoints_to_alarm       = 3
  threshold                 = 0
  comparison_operator       = "GreaterThanThreshold"
  treat_missing_data        = "missing"
}

resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  count = local.observability_count
  # Intent            : "The alarm helps detect a high number of throttled invocation requests for a Lambda function. It is important to know if requests are constantly getting rejected due to throttling and if you need to improve Lambda function performance or increase concurrency capacity to avoid constant throttling."
  # Threshold Justification : "Set the threshold to a number greater than zero. The exact value of the threshold can depend on the tolerance of the application. Set the threshold according to its usage and scaling requirements of the function."
  alarm_name                = "AWS/Lambda Throttles"
  alarm_description         = "This alarm detects a high number of throttled invocation requests. Throttling occurs when there is no concurrency is available for scale up. There are several approaches to resolve this issue. 1) Request a concurrency increase from AWS Support in this Region. 2) Identify performance issues in the function to improve the speed of processing and therefore improve throughput. 3) Increase the batch size of the function, so that more messages are processed by each function invocation."
  actions_enabled           = true
  ok_actions                = [local.alarm_actions]
  alarm_actions             = [local.alarm_actions]
  insufficient_data_actions = [local.alarm_actions]
  metric_name               = "Throttles"
  namespace                 = "AWS/Lambda"
  statistic                 = "Sum"
  period                    = 60
  dimensions                = {}
  evaluation_periods        = 5
  datapoints_to_alarm       = 5
  threshold                 = 0.1
  comparison_operator       = "GreaterThanOrEqualToThreshold"
  treat_missing_data        = "missing"
}
