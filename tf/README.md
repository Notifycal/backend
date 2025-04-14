<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | >= 1.5 |
| <a name="requirement_aws"></a> [aws](#requirement\_aws) | ~> 5.86 |
| <a name="requirement_awscc"></a> [awscc](#requirement\_awscc) | ~> 1.28 |
| <a name="requirement_cloudflare"></a> [cloudflare](#requirement\_cloudflare) | 4.52.0 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_aws"></a> [aws](#provider\_aws) | 5.94.1 |
| <a name="provider_awscc"></a> [awscc](#provider\_awscc) | 1.36.0 |
| <a name="provider_tls"></a> [tls](#provider\_tls) | 4.0.6 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_actionable_event_found_queue"></a> [actionable\_event\_found\_queue](#module\_actionable\_event\_found\_queue) | ./modules/sqs | n/a |
| <a name="module_actionable_event_found_topic"></a> [actionable\_event\_found\_topic](#module\_actionable\_event\_found\_topic) | ./modules/sns | n/a |
| <a name="module_api_rest_topic"></a> [api\_rest\_topic](#module\_api\_rest\_topic) | ./modules/sns | n/a |
| <a name="module_apigateway_custom_domain"></a> [apigateway\_custom\_domain](#module\_apigateway\_custom\_domain) | ./modules/api_gateway_external_domain | n/a |
| <a name="module_audit_trail_lambda"></a> [audit\_trail\_lambda](#module\_audit\_trail\_lambda) | terraform-aws-modules/lambda/aws | ~> 7.17 |
| <a name="module_audit_trail_queue"></a> [audit\_trail\_queue](#module\_audit\_trail\_queue) | ./modules/sqs | n/a |
| <a name="module_event_reminder_status_change_webhook_lambda"></a> [event\_reminder\_status\_change\_webhook\_lambda](#module\_event\_reminder\_status\_change\_webhook\_lambda) | terraform-aws-modules/lambda/aws | ~> 7.17 |
| <a name="module_event_reminder_status_change_webhook_lambda_alias"></a> [event\_reminder\_status\_change\_webhook\_lambda\_alias](#module\_event\_reminder\_status\_change\_webhook\_lambda\_alias) | terraform-aws-modules/lambda/aws//modules/alias | ~> 7.17 |
| <a name="module_fetch_user_calendars_lambda"></a> [fetch\_user\_calendars\_lambda](#module\_fetch\_user\_calendars\_lambda) | terraform-aws-modules/lambda/aws | ~> 7.17 |
| <a name="module_fetch_user_calendars_queue"></a> [fetch\_user\_calendars\_queue](#module\_fetch\_user\_calendars\_queue) | ./modules/sqs | n/a |
| <a name="module_find_actionable_events_lambda"></a> [find\_actionable\_events\_lambda](#module\_find\_actionable\_events\_lambda) | terraform-aws-modules/lambda/aws | ~> 7.17 |
| <a name="module_get_idp_user_calendars_lambda"></a> [get\_idp\_user\_calendars\_lambda](#module\_get\_idp\_user\_calendars\_lambda) | terraform-aws-modules/lambda/aws | ~> 7.17 |
| <a name="module_get_idp_user_calendars_lambda_alias"></a> [get\_idp\_user\_calendars\_lambda\_alias](#module\_get\_idp\_user\_calendars\_lambda\_alias) | terraform-aws-modules/lambda/aws//modules/alias | ~> 7.17 |
| <a name="module_get_user_profile_lambda"></a> [get\_user\_profile\_lambda](#module\_get\_user\_profile\_lambda) | terraform-aws-modules/lambda/aws | ~> 7.17 |
| <a name="module_get_user_profile_lambda_alias"></a> [get\_user\_profile\_lambda\_alias](#module\_get\_user\_profile\_lambda\_alias) | terraform-aws-modules/lambda/aws//modules/alias | ~> 7.17 |
| <a name="module_messaging_topic"></a> [messaging\_topic](#module\_messaging\_topic) | ./modules/sns | n/a |
| <a name="module_notify_slack"></a> [notify\_slack](#module\_notify\_slack) | git@github.com:Notifycal/tofu-module-aws-slack-notify.git | work-with-bot-post-message |
| <a name="module_patch_user_profile_lambda"></a> [patch\_user\_profile\_lambda](#module\_patch\_user\_profile\_lambda) | terraform-aws-modules/lambda/aws | ~> 7.17 |
| <a name="module_patch_user_profile_lambda_alias"></a> [patch\_user\_profile\_lambda\_alias](#module\_patch\_user\_profile\_lambda\_alias) | terraform-aws-modules/lambda/aws//modules/alias | ~> 7.17 |
| <a name="module_post_login_lambda"></a> [post\_login\_lambda](#module\_post\_login\_lambda) | terraform-aws-modules/lambda/aws | ~> 7.17 |
| <a name="module_post_login_lambda_alias"></a> [post\_login\_lambda\_alias](#module\_post\_login\_lambda\_alias) | terraform-aws-modules/lambda/aws//modules/alias | ~> 7.17 |
| <a name="module_post_refresh_lambda"></a> [post\_refresh\_lambda](#module\_post\_refresh\_lambda) | terraform-aws-modules/lambda/aws | ~> 7.17 |
| <a name="module_post_refresh_lambda_alias"></a> [post\_refresh\_lambda\_alias](#module\_post\_refresh\_lambda\_alias) | terraform-aws-modules/lambda/aws//modules/alias | ~> 7.17 |
| <a name="module_send_event_reminder_lambda"></a> [send\_event\_reminder\_lambda](#module\_send\_event\_reminder\_lambda) | terraform-aws-modules/lambda/aws | ~> 7.17 |
| <a name="module_user_calendar_fetched_queue"></a> [user\_calendar\_fetched\_queue](#module\_user\_calendar\_fetched\_queue) | ./modules/sqs | n/a |
| <a name="module_user_calendar_fetched_topic"></a> [user\_calendar\_fetched\_topic](#module\_user\_calendar\_fetched\_topic) | ./modules/sns | n/a |

## Resources

| Name | Type |
|------|------|
| [aws_api_gateway_deployment.api_deployment](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_deployment) | resource |
| [aws_api_gateway_method_settings.method_settings](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_method_settings) | resource |
| [aws_api_gateway_rest_api.rest_api](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_rest_api) | resource |
| [aws_api_gateway_stage.stage](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_stage) | resource |
| [aws_cloudwatch_event_rule.fetch_user_calendars_trigger_rule](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule) | resource |
| [aws_cloudwatch_event_target.fetch_user_calendars_event_target](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target) | resource |
| [aws_cloudwatch_log_data_protection_policy.no_credentials_in_logs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_data_protection_policy) | resource |
| [aws_cloudwatch_metric_alarm.lambda_concurrent_executions](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm) | resource |
| [aws_cloudwatch_metric_alarm.lambda_duration](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm) | resource |
| [aws_cloudwatch_metric_alarm.lambda_errors](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm) | resource |
| [aws_cloudwatch_metric_alarm.lambda_invocations](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm) | resource |
| [aws_cloudwatch_metric_alarm.lambda_throttles](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm) | resource |
| [aws_cloudwatch_metric_alarm.sqs_dlq_number_of_messages](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm) | resource |
| [aws_dynamodb_table.audit_trail_events](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table) | resource |
| [aws_dynamodb_table.lambda_idempotency](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table) | resource |
| [aws_dynamodb_table.refresh_tokens](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table) | resource |
| [aws_dynamodb_table.users](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table) | resource |
| [aws_iam_role.sns_feedback_role](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role) | resource |
| [aws_sqs_queue.global_dlq_lambda](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue) | resource |
| [aws_sqs_queue.global_dlq_sqs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue) | resource |
| [aws_sqs_queue.global_dlq_unprocessable_sqs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue) | resource |
| [aws_sqs_queue.global_unprocessable](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue) | resource |
| [aws_sqs_queue_redrive_allow_policy.dlq_redrive_allow_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue_redrive_allow_policy) | resource |
| [aws_ssm_parameter.jwt_access_key](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter) | resource |
| [aws_ssm_parameter.jwt_refresh_key](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter) | resource |
| [awscc_xray_resource_policy.xray_sns_resource_policy](https://registry.terraform.io/providers/hashicorp/awscc/latest/docs/resources/xray_resource_policy) | resource |
| [tls_private_key.jwt_access_key](https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/private_key) | resource |
| [tls_private_key.jwt_refresh_key](https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/private_key) | resource |
| [aws_caller_identity.current](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity) | data source |
| [aws_iam_policy.insights](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy) | data source |
| [aws_iam_policy_document.audit_trail_iam_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.event_reminder_status_change_webhook_iam_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.fetch_user_calendars_iam_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.find_actionable_events_iam_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.get_idp_user_calendars_iam_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.get_user_profile_iam_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.patch_user_profile_iam_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.post_login_iam_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.post_refresh_iam_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.send_event_reminder_iam_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.sns_feedback_assume_role_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.sns_feedback_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.xray_sns_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_ssm_parameter.slack_bot_token](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssm_parameter) | data source |
| [aws_ssm_parameter.vonage_private_key](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssm_parameter) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_api_gateway_custom_domain_enabled"></a> [api\_gateway\_custom\_domain\_enabled](#input\_api\_gateway\_custom\_domain\_enabled) | Controls the creation of a custom domain for API Gateway and the domain it is accessible from | `bool` | `true` | no |
| <a name="input_api_stage_name"></a> [api\_stage\_name](#input\_api\_stage\_name) | n/a | `string` | n/a | yes |
| <a name="input_app_version"></a> [app\_version](#input\_app\_version) | n/a | `string` | n/a | yes |
| <a name="input_aws_region"></a> [aws\_region](#input\_aws\_region) | n/a | `string` | n/a | yes |
| <a name="input_base_domain"></a> [base\_domain](#input\_base\_domain) | n/a | `string` | `"notifycal.com"` | no |
| <a name="input_domain_prefix"></a> [domain\_prefix](#input\_domain\_prefix) | n/a | `string` | `"api"` | no |
| <a name="input_enable_xray_active_tracing"></a> [enable\_xray\_active\_tracing](#input\_enable\_xray\_active\_tracing) | n/a | `bool` | `true` | no |
| <a name="input_environment"></a> [environment](#input\_environment) | n/a | `string` | n/a | yes |
| <a name="input_frontend_domain"></a> [frontend\_domain](#input\_frontend\_domain) | Allowed domain specified in response headers by API gateway lambdas(TLDR: CORS) | `string` | n/a | yes |
| <a name="input_google_oauth_config"></a> [google\_oauth\_config](#input\_google\_oauth\_config) | n/a | <pre>object({<br/>    client_id     = string<br/>    client_secret = string<br/>    redirect_url  = string<br/>  })</pre> | n/a | yes |
| <a name="input_jwt_config"></a> [jwt\_config](#input\_jwt\_config) | n/a | <pre>object({<br/>    access = object({<br/>      algorithm  = optional(string, "ES256")<br/>      audience   = optional(string, "notifycal.com")<br/>      expiration = optional(string, "5m")<br/>      issuer     = optional(string, "notifycal.com")<br/>    })<br/>    refresh = object({<br/>      algorithm  = optional(string, "ES256")<br/>      audience   = optional(string, "notifycal.com")<br/>      expiration = optional(string, "7d")<br/>      issuer     = optional(string, "notifycal.com")<br/>    })<br/>  })</pre> | <pre>{<br/>  "access": {},<br/>  "refresh": {}<br/>}</pre> | no |
| <a name="input_lambdas_handler_name"></a> [lambdas\_handler\_name](#input\_lambdas\_handler\_name) | n/a | `string` | `"index.handler"` | no |
| <a name="input_lambdas_live_alias_name"></a> [lambdas\_live\_alias\_name](#input\_lambdas\_live\_alias\_name) | n/a | `string` | `"live"` | no |
| <a name="input_lambdas_logging_log_format"></a> [lambdas\_logging\_log\_format](#input\_lambdas\_logging\_log\_format) | n/a | `string` | `"JSON"` | no |
| <a name="input_lambdas_runtime"></a> [lambdas\_runtime](#input\_lambdas\_runtime) | n/a | `string` | `"nodejs22.x"` | no |
| <a name="input_observability"></a> [observability](#input\_observability) | n/a | <pre>object({<br/>    slack_webhook_url = string<br/>    slack_channel     = string<br/>  })</pre> | n/a | yes |
| <a name="input_openapi_spec_file"></a> [openapi\_spec\_file](#input\_openapi\_spec\_file) | Name of the OpenAPI spec file for this API | `string` | `"spec.yaml"` | no |
| <a name="input_vonage_auth_config"></a> [vonage\_auth\_config](#input\_vonage\_auth\_config) | n/a | <pre>object({<br/>    api_key                    = string<br/>    application_id             = string<br/>    private_key_secret_path    = string<br/>    webhook_jwt_signing_secret = string<br/>  })</pre> | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_global_dlq_lambdas"></a> [global\_dlq\_lambdas](#output\_global\_dlq\_lambdas) | n/a |
| <a name="output_global_dlq_sqs"></a> [global\_dlq\_sqs](#output\_global\_dlq\_sqs) | n/a |
<!-- END_TF_DOCS -->
