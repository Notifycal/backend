variable "topic_name" {
  type        = string
  description = "SNS topic name"
}

variable "topic_display_name" {
  type        = string
  description = "SNS topic display name"
}

variable "subscribers" {
  type = map(object({
    arn                 = string
    filter_policy       = string
    filter_policy_scope = optional(string, "MessageAttributes")
  }))
  description = "Map containg keys representing the subscriber name and values representing the subscriber AWS arn"
}

variable "topic_config" {
  type = object({
    fifo                        = optional(bool, true)
    content_based_deduplication = optional(bool, true)
  })
  default = {
    fifo                        = true
    content_based_deduplication = true
  }
}

variable "enable_xray_active_tracing" {
  type    = bool
  default = true
}

variable "sns_feedback_iam_role_arn" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
