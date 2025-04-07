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
    filter_policy       = optional(string)
    filter_policy_scope = optional(string)
  }))
  description = "Map containg keys representing the subscriber name and values representing the subscriber AWS arn"

  validation {
    condition = alltrue([
      for k, v in var.subscribers :
      v.filter_policy_scope == null ||
      v.filter_policy_scope == "MessageAttributes" ||
      v.filter_policy_scope == "MessageBody"
    ])
    error_message = "The filter_policy_scope must be either 'MessageAttributes' or 'MessageBody'."
  }

  validation {
    condition = alltrue([
      for k, v in var.subscribers :
      v.filter_policy_scope == null || v.filter_policy != null
    ])
    error_message = "When filter_policy_scope is set, filter_policy must also be provided."
  }
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
