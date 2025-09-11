<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | >= 1.5 |
| <a name="requirement_aws"></a> [aws](#requirement\_aws) | >= 5.0 |
| <a name="requirement_awscc"></a> [awscc](#requirement\_awscc) | >= 1.0 |
| <a name="requirement_cloudflare"></a> [cloudflare](#requirement\_cloudflare) | >= 5.8 |
| <a name="requirement_restapi"></a> [restapi](#requirement\_restapi) | >= 2.0.1 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_aws"></a> [aws](#provider\_aws) | >= 5.0 |
| <a name="provider_awscc"></a> [awscc](#provider\_awscc) | >= 1.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_actionable_event_found_queue"></a> [actionable\_event\_found\_queue](#module\_actionable\_event\_found\_queue) | ./modules/sqs | n/a |
| <a name="module_actionable_event_found_topic"></a> [actionable\_event\_found\_topic](#module\_actionable\_event\_found\_topic) | ./modules/sns | n/a |
| <a name="module_alert_for_events_lambda"></a> [alert\_for\_events\_lambda](#module\_alert\_for\_events\_lambda) | terraform-aws-modules/lambda/aws | ~> 8.0 |
| <a name="module_alert_for_missing_phone_number_lambda"></a> [alert\_for\_missing\_phone\_number\_lambda](#module\_alert\_for\_missing\_phone\_number\_lambda) | terraform-aws-modules/lambda/aws | ~> 8.0 |
| <a name="module_api_rest_topic"></a> [api\_rest\_topic](#module\_api\_rest\_topic) | ./modules/sns | n/a |
| <a name="module_apigateway_custom_domain"></a> [apigateway\_custom\_domain](#module\_apigateway\_custom\_domain) | ./modules/api_gateway_external_domain | n/a |
| <a name="module_audit_trail_lambda"></a> [audit\_trail\_lambda](#module\_audit\_trail\_lambda) | terraform-aws-modules/lambda/aws | ~> 8.0 |
| <a name="module_audit_trail_queue"></a> [audit\_trail\_queue](#module\_audit\_trail\_queue) | ./modules/sqs | n/a |
| <a name="module_demo_reminder_to_be_sent_queue"></a> [demo\_reminder\_to\_be\_sent\_queue](#module\_demo\_reminder\_to\_be\_sent\_queue) | ./modules/sqs | n/a |
| <a name="module_demo_reminder_to_be_sent_topic"></a> [demo\_reminder\_to\_be\_sent\_topic](#module\_demo\_reminder\_to\_be\_sent\_topic) | ./modules/sns | n/a |
| <a name="module_email_to_be_sent_queue"></a> [email\_to\_be\_sent\_queue](#module\_email\_to\_be\_sent\_queue) | ./modules/sqs | n/a |
| <a name="module_email_to_be_sent_topic"></a> [email\_to\_be\_sent\_topic](#module\_email\_to\_be\_sent\_topic) | ./modules/sns | n/a |
| <a name="module_emailing_topic"></a> [emailing\_topic](#module\_emailing\_topic) | ./modules/sns | n/a |
| <a name="module_event_reminder_status_change_webhook_lambda"></a> [event\_reminder\_status\_change\_webhook\_lambda](#module\_event\_reminder\_status\_change\_webhook\_lambda) | terraform-aws-modules/lambda/aws | ~> 8.0 |
| <a name="module_event_reminder_status_change_webhook_lambda_alias"></a> [event\_reminder\_status\_change\_webhook\_lambda\_alias](#module\_event\_reminder\_status\_change\_webhook\_lambda\_alias) | terraform-aws-modules/lambda/aws//modules/alias | ~> 8.0 |
| <a name="module_fetch_user_calendars_lambda"></a> [fetch\_user\_calendars\_lambda](#module\_fetch\_user\_calendars\_lambda) | terraform-aws-modules/lambda/aws | ~> 8.0 |
| <a name="module_fetch_user_calendars_queue"></a> [fetch\_user\_calendars\_queue](#module\_fetch\_user\_calendars\_queue) | ./modules/sqs | n/a |
| <a name="module_find_actionable_events_lambda"></a> [find\_actionable\_events\_lambda](#module\_find\_actionable\_events\_lambda) | terraform-aws-modules/lambda/aws | ~> 8.0 |
| <a name="module_get_idp_user_calendars_lambda"></a> [get\_idp\_user\_calendars\_lambda](#module\_get\_idp\_user\_calendars\_lambda) | terraform-aws-modules/lambda/aws | ~> 8.0 |
| <a name="module_get_idp_user_calendars_lambda_alias"></a> [get\_idp\_user\_calendars\_lambda\_alias](#module\_get\_idp\_user\_calendars\_lambda\_alias) | terraform-aws-modules/lambda/aws//modules/alias | ~> 8.0 |
| <a name="module_get_user_profile_lambda"></a> [get\_user\_profile\_lambda](#module\_get\_user\_profile\_lambda) | terraform-aws-modules/lambda/aws | ~> 8.0 |
| <a name="module_get_user_profile_lambda_alias"></a> [get\_user\_profile\_lambda\_alias](#module\_get\_user\_profile\_lambda\_alias) | terraform-aws-modules/lambda/aws//modules/alias | ~> 8.0 |
| <a name="module_messaging_topic"></a> [messaging\_topic](#module\_messaging\_topic) | ./modules/sns | n/a |
| <a name="module_notify_slack"></a> [notify\_slack](#module\_notify\_slack) | git@github.com:Notifycal/tofu-module-aws-slack-notify.git | v7.0.3 |
| <a name="module_patch_user_profile_lambda"></a> [patch\_user\_profile\_lambda](#module\_patch\_user\_profile\_lambda) | terraform-aws-modules/lambda/aws | ~> 8.0 |
| <a name="module_patch_user_profile_lambda_alias"></a> [patch\_user\_profile\_lambda\_alias](#module\_patch\_user\_profile\_lambda\_alias) | terraform-aws-modules/lambda/aws//modules/alias | ~> 8.0 |
| <a name="module_payment_webhook_topic"></a> [payment\_webhook\_topic](#module\_payment\_webhook\_topic) | ./modules/sns | n/a |
| <a name="module_post_customer_portal_session_lambda"></a> [post\_customer\_portal\_session\_lambda](#module\_post\_customer\_portal\_session\_lambda) | terraform-aws-modules/lambda/aws | ~> 8.0 |
| <a name="module_post_customer_portal_session_lambda_alias"></a> [post\_customer\_portal\_session\_lambda\_alias](#module\_post\_customer\_portal\_session\_lambda\_alias) | terraform-aws-modules/lambda/aws//modules/alias | ~> 8.0 |
| <a name="module_post_demo_reminder_lambda"></a> [post\_demo\_reminder\_lambda](#module\_post\_demo\_reminder\_lambda) | terraform-aws-modules/lambda/aws | ~> 8.0 |
| <a name="module_post_demo_reminder_lambda_alias"></a> [post\_demo\_reminder\_lambda\_alias](#module\_post\_demo\_reminder\_lambda\_alias) | terraform-aws-modules/lambda/aws//modules/alias | ~> 8.0 |
| <a name="module_post_login_lambda"></a> [post\_login\_lambda](#module\_post\_login\_lambda) | terraform-aws-modules/lambda/aws | ~> 8.0 |
| <a name="module_post_login_lambda_alias"></a> [post\_login\_lambda\_alias](#module\_post\_login\_lambda\_alias) | terraform-aws-modules/lambda/aws//modules/alias | ~> 8.0 |
| <a name="module_post_payment_session_lambda"></a> [post\_payment\_session\_lambda](#module\_post\_payment\_session\_lambda) | terraform-aws-modules/lambda/aws | ~> 8.0 |
| <a name="module_post_payment_session_lambda_alias"></a> [post\_payment\_session\_lambda\_alias](#module\_post\_payment\_session\_lambda\_alias) | terraform-aws-modules/lambda/aws//modules/alias | ~> 8.0 |
| <a name="module_post_refresh_lambda"></a> [post\_refresh\_lambda](#module\_post\_refresh\_lambda) | terraform-aws-modules/lambda/aws | ~> 8.0 |
| <a name="module_post_refresh_lambda_alias"></a> [post\_refresh\_lambda\_alias](#module\_post\_refresh\_lambda\_alias) | terraform-aws-modules/lambda/aws//modules/alias | ~> 8.0 |
| <a name="module_send_email_lambda"></a> [send\_email\_lambda](#module\_send\_email\_lambda) | terraform-aws-modules/lambda/aws | ~> 8.0 |
| <a name="module_send_event_reminder_lambda"></a> [send\_event\_reminder\_lambda](#module\_send\_event\_reminder\_lambda) | terraform-aws-modules/lambda/aws | ~> 8.0 |
| <a name="module_stripe_admin_webhook"></a> [stripe\_admin\_webhook](#module\_stripe\_admin\_webhook) | ./modules/stripe-webhook | n/a |
| <a name="module_stripe_webhook"></a> [stripe\_webhook](#module\_stripe\_webhook) | ./modules/stripe-webhook | n/a |
| <a name="module_stripe_webhook_lambda"></a> [stripe\_webhook\_lambda](#module\_stripe\_webhook\_lambda) | terraform-aws-modules/lambda/aws | ~> 8.0 |
| <a name="module_stripe_webhook_queue"></a> [stripe\_webhook\_queue](#module\_stripe\_webhook\_queue) | ./modules/sqs | n/a |
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
| [aws_cloudwatch_event_target.all_events](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target) | resource |
| [aws_cloudwatch_event_target.fetch_user_calendars_event_target](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target) | resource |
| [aws_cloudwatch_log_data_protection_policy.no_credentials_in_logs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_data_protection_policy) | resource |
| [aws_cloudwatch_log_group.api_access_logs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group) | resource |
| [aws_cloudwatch_log_group.api_execution_logs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group) | resource |
| [aws_cloudwatch_metric_alarm.integration_error_rate_alarms](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm) | resource |
| [aws_cloudwatch_metric_alarm.lambda_concurrent_executions](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm) | resource |
| [aws_cloudwatch_metric_alarm.lambda_duration](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm) | resource |
| [aws_cloudwatch_metric_alarm.lambda_errors](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm) | resource |
| [aws_cloudwatch_metric_alarm.lambda_invocations](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm) | resource |
| [aws_cloudwatch_metric_alarm.lambda_throttles](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm) | resource |
| [aws_cloudwatch_metric_alarm.sqs_dlq_number_of_messages](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm) | resource |
| [aws_dynamodb_table.audit_trail_events](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table) | resource |
| [aws_dynamodb_table.business_alerts](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table) | resource |
| [aws_dynamodb_table.lambda_idempotency](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table) | resource |
| [aws_dynamodb_table.refresh_tokens](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table) | resource |
| [aws_dynamodb_table.users](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table) | resource |
| [aws_iam_role.sns_feedback_role](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role) | resource |
| [aws_sqs_queue.global_dlq_lambda](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue) | resource |
| [aws_sqs_queue.global_dlq_sqs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue) | resource |
| [aws_sqs_queue.global_dlq_unprocessable_sqs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue) | resource |
| [aws_sqs_queue.global_unprocessable](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue) | resource |
| [aws_sqs_queue_redrive_allow_policy.dlq_redrive_allow_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue_redrive_allow_policy) | resource |
| [awscc_xray_resource_policy.xray_sns_resource_policy](https://registry.terraform.io/providers/hashicorp/awscc/latest/docs/resources/xray_resource_policy) | resource |
| [aws_caller_identity.current](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity) | data source |
| [aws_iam_policy.appsignals](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy) | data source |
| [aws_iam_policy.insights](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy) | data source |
| [aws_iam_policy_document.alert_for_events_iam_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.alert_for_missing_phone_number_iam_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.audit_trail_iam_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.demo_reminder_to_be_sent_iam_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.event_reminder_status_change_webhook_iam_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.fetch_user_calendars_iam_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.find_actionable_events_iam_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.get_idp_user_calendars_iam_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.get_user_profile_iam_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.patch_user_profile_iam_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.post_customer_portal_session_iam_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.post_login_iam_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.post_payment_session_iam_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.post_refresh_iam_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.send_email_iam_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.send_event_reminder_iam_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.sns_feedback_assume_role_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.sns_feedback_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.stripe_webhook_iam_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.xray_sns_policydoc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_ssm_parameter.slack_bot_token](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssm_parameter) | data source |
| [aws_ssm_parameter.vonage_private_key](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssm_parameter) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_alert_for_missing_phone_number"></a> [alert\_for\_missing\_phone\_number](#input\_alert\_for\_missing\_phone\_number) | n/a | <pre>object({<br/>    error_rate_threshold              = optional(number, 5)<br/>    max_notifications_per_day         = optional(number, 1)<br/>    count_threshold_to_enable_trigger = optional(number, 0)<br/>  })</pre> | `{}` | no |
| <a name="input_allowed_origins"></a> [allowed\_origins](#input\_allowed\_origins) | Allowed origins specified in response headers by API gateway lambdas(TLDR: CORS). The value matching the request header origin will be set in the response | `list(string)` | n/a | yes |
| <a name="input_api_gateway_custom_domain_enabled"></a> [api\_gateway\_custom\_domain\_enabled](#input\_api\_gateway\_custom\_domain\_enabled) | Controls the creation of a custom domain for API Gateway and the domain it is accessible from | `bool` | `true` | no |
| <a name="input_api_gateway_custom_domain_ttl"></a> [api\_gateway\_custom\_domain\_ttl](#input\_api\_gateway\_custom\_domain\_ttl) | TTL for the custom DNS record for API Gateway. | `number` | `300` | no |
| <a name="input_api_gateway_logging"></a> [api\_gateway\_logging](#input\_api\_gateway\_logging) | API Gateway logging configuration. Log retention default value matches what the privacy policy states. | <pre>object({<br/>    data_trace_enabled       = optional(bool, false)<br/>    logging_level            = optional(string, "ERROR")<br/>    execution_logs_retention = optional(number, 180)<br/>    access_logs_retention    = optional(number, 180)<br/>  })</pre> | <pre>{<br/>  "access_logs_retention": 180,<br/>  "data_trace_enabled": false,<br/>  "execution_logs_retention": 180,<br/>  "logging_level": "ERROR"<br/>}</pre> | no |
| <a name="input_api_stage_name"></a> [api\_stage\_name](#input\_api\_stage\_name) | n/a | `string` | n/a | yes |
| <a name="input_app_version"></a> [app\_version](#input\_app\_version) | n/a | `string` | n/a | yes |
| <a name="input_aws_region"></a> [aws\_region](#input\_aws\_region) | n/a | `string` | n/a | yes |
| <a name="input_base_domain"></a> [base\_domain](#input\_base\_domain) | n/a | `string` | `"notifycal.com"` | no |
| <a name="input_country_to_sms_cost_map"></a> [country\_to\_sms\_cost\_map](#input\_country\_to\_sms\_cost\_map) | n/a | `map(number)` | n/a | yes |
| <a name="input_customer_portal_configuration_id"></a> [customer\_portal\_configuration\_id](#input\_customer\_portal\_configuration\_id) | ID to reference the customer portal configuration | `string` | n/a | yes |
| <a name="input_deletion_protection_enabled"></a> [deletion\_protection\_enabled](#input\_deletion\_protection\_enabled) | n/a | `bool` | `true` | no |
| <a name="input_disable_execute_api_endpoint"></a> [disable\_execute\_api\_endpoint](#input\_disable\_execute\_api\_endpoint) | Controls whether the API Gateway will be accessible through the AWS-generated URL when var.api\_gateway\_custom\_domain\_enabled is set to true. | `bool` | `true` | no |
| <a name="input_domain_prefix"></a> [domain\_prefix](#input\_domain\_prefix) | n/a | `string` | `"api"` | no |
| <a name="input_emailing_config"></a> [emailing\_config](#input\_emailing\_config) | n/a | <pre>object({<br/>    enabled = bool<br/>    sender = object({<br/>      displayName = optional(string, "Notifycal")<br/>      email       = string<br/>    })<br/>  })</pre> | <pre>{<br/>  "enabled": true,<br/>  "sender": {<br/>    "displayName": "Notifycal",<br/>    "email": "info@notifycal.com"<br/>  }<br/>}</pre> | no |
| <a name="input_enable_data_protection"></a> [enable\_data\_protection](#input\_enable\_data\_protection) | n/a | `bool` | `true` | no |
| <a name="input_enable_xray_active_tracing"></a> [enable\_xray\_active\_tracing](#input\_enable\_xray\_active\_tracing) | n/a | `bool` | `true` | no |
| <a name="input_environment"></a> [environment](#input\_environment) | n/a | `string` | n/a | yes |
| <a name="input_frontend_url"></a> [frontend\_url](#input\_frontend\_url) | n/a | `string` | `"https://private.notifycal.com"` | no |
| <a name="input_google_oauth_config"></a> [google\_oauth\_config](#input\_google\_oauth\_config) | n/a | <pre>object({<br/>    client_id         = string<br/>    client_secret     = string<br/>    redirect_url_list = list(string)<br/>  })</pre> | n/a | yes |
| <a name="input_jwt_config"></a> [jwt\_config](#input\_jwt\_config) | n/a | <pre>object({<br/>    access = object({<br/>      algorithm  = string<br/>      audience   = string<br/>      expiration = string<br/>      issuer     = string<br/>    })<br/>    refresh = object({<br/>      algorithm  = string<br/>      audience   = string<br/>      expiration = string<br/>      issuer     = string<br/>    })<br/>  })</pre> | n/a | yes |
| <a name="input_jwt_keys"></a> [jwt\_keys](#input\_jwt\_keys) | n/a | <pre>object({<br/>    access = object({<br/>      public_key  = string<br/>      private_key = string<br/>    })<br/>    refresh = object({<br/>      public_key  = string<br/>      private_key = string<br/>    })<br/>  })</pre> | n/a | yes |
| <a name="input_lambda_logging"></a> [lambda\_logging](#input\_lambda\_logging) | Lambda logging configuration. Log retention default value matches what the privacy policy states. | <pre>object({<br/>    retention_in_days = optional(number, 180)<br/>    format            = optional(string, "JSON")<br/>  })</pre> | <pre>{<br/>  "retention_in_days": 180<br/>}</pre> | no |
| <a name="input_lambdas_handler_name"></a> [lambdas\_handler\_name](#input\_lambdas\_handler\_name) | n/a | `string` | `"index.handler"` | no |
| <a name="input_lambdas_live_alias_name"></a> [lambdas\_live\_alias\_name](#input\_lambdas\_live\_alias\_name) | n/a | `string` | `"live"` | no |
| <a name="input_lambdas_runtime"></a> [lambdas\_runtime](#input\_lambdas\_runtime) | n/a | `string` | `"nodejs22.x"` | no |
| <a name="input_mailgun_auth"></a> [mailgun\_auth](#input\_mailgun\_auth) | n/a | <pre>object({<br/>    api_key = string<br/>  })</pre> | n/a | yes |
| <a name="input_mailgun_config"></a> [mailgun\_config](#input\_mailgun\_config) | n/a | <pre>object({<br/>    base_url    = string<br/>    domain_name = string<br/>  })</pre> | n/a | yes |
| <a name="input_messaging_config"></a> [messaging\_config](#input\_messaging\_config) | n/a | <pre>object({<br/>    enabled = bool<br/>  })</pre> | <pre>{<br/>  "enabled": true<br/>}</pre> | no |
| <a name="input_observability"></a> [observability](#input\_observability) | n/a | <pre>object({<br/>    alert_notifier = object({<br/>      slack_channel = string<br/>    })<br/>    alert_config = optional(object({<br/>      treat_missing_data       = optional(string, "missing")<br/>      notify_insufficient_data = optional(bool, true)<br/>      }), {<br/>      treat_missing_data       = "missing"<br/>      notify_insufficient_data = true<br/>    })<br/>  })</pre> | n/a | yes |
| <a name="input_openapi_spec_file"></a> [openapi\_spec\_file](#input\_openapi\_spec\_file) | Name of the OpenAPI spec file for this API | `string` | `"spec.yaml"` | no |
| <a name="input_payment_plans"></a> [payment\_plans](#input\_payment\_plans) | Configuration for subscription tiers. E.g.: Good, Better, Best and topups E.g.: x100 | <pre>object({<br/>    tiers = map(object({<br/>      price_id = string<br/>      name     = string<br/>      credits  = number<br/>    }))<br/>    topups = map(object({<br/>      price_id = string<br/>      name     = string<br/>      credits  = number<br/>    }))<br/>  })</pre> | n/a | yes |
| <a name="input_stripe_admin_api_key"></a> [stripe\_admin\_api\_key](#input\_stripe\_admin\_api\_key) | Stripe admin API key. See stripe.README.md | `string` | n/a | yes |
| <a name="input_stripe_admin_webhook_url"></a> [stripe\_admin\_webhook\_url](#input\_stripe\_admin\_webhook\_url) | Endpoint URL for Stripe to send admin-level updates such us new customer, disputes open, etc.. Typically, it will be the Stripe Slack App. It requires a manual step: check out https://notifycal.slack.com/marketplace/A0F81FNVC-stripe | `string` | `null` | no |
| <a name="input_stripe_api_version"></a> [stripe\_api\_version](#input\_stripe\_api\_version) | n/a | `string` | `"2025-05-28.basil"` | no |
| <a name="input_stripe_operating_api_key"></a> [stripe\_operating\_api\_key](#input\_stripe\_operating\_api\_key) | Stripe operating API key. See stripe.README.md | `string` | n/a | yes |
| <a name="input_tax_id"></a> [tax\_id](#input\_tax\_id) | ID to reference to tax resource in Stripe. Typically, it will be a tax id that involves adding 21% of VAT (Spanish IVA) | `string` | n/a | yes |
| <a name="input_vendor_alarm_config"></a> [vendor\_alarm\_config](#input\_vendor\_alarm\_config) | Configuration for each integration vendor's error rate alarm | <pre>object({<br/>    Vonage = object({<br/>      error_rate_threshold      = number<br/>      evaluation_period_seconds = number<br/>      datapoints_to_alarm       = number<br/>      evaluation_periods        = number<br/>    })<br/>    Mailgun = object({<br/>      error_rate_threshold      = number<br/>      evaluation_period_seconds = number<br/>      datapoints_to_alarm       = number<br/>      evaluation_periods        = number<br/>    })<br/>    Google = object({<br/>      error_rate_threshold      = number<br/>      evaluation_period_seconds = number<br/>      datapoints_to_alarm       = number<br/>      evaluation_periods        = number<br/>    })<br/>  })</pre> | <pre>{<br/>  "Google": {<br/>    "datapoints_to_alarm": 1,<br/>    "error_rate_threshold": 2,<br/>    "evaluation_period_seconds": 3600,<br/>    "evaluation_periods": 1<br/>  },<br/>  "Mailgun": {<br/>    "datapoints_to_alarm": 1,<br/>    "error_rate_threshold": 5,<br/>    "evaluation_period_seconds": 3600,<br/>    "evaluation_periods": 1<br/>  },<br/>  "Vonage": {<br/>    "datapoints_to_alarm": 1,<br/>    "error_rate_threshold": 2,<br/>    "evaluation_period_seconds": 3600,<br/>    "evaluation_periods": 1<br/>  }<br/>}</pre> | no |
| <a name="input_vonage_auth_config"></a> [vonage\_auth\_config](#input\_vonage\_auth\_config) | n/a | <pre>object({<br/>    api_key                    = string<br/>    application_id             = string<br/>    private_key_secret_path    = string<br/>    webhook_jwt_signing_secret = string<br/>  })</pre> | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_api_url"></a> [api\_url](#output\_api\_url) | n/a |
| <a name="output_global_dlq_lambdas"></a> [global\_dlq\_lambdas](#output\_global\_dlq\_lambdas) | n/a |
| <a name="output_global_dlq_sqs"></a> [global\_dlq\_sqs](#output\_global\_dlq\_sqs) | n/a |
<!-- END_TF_DOCS -->
