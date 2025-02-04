variable "topic_name" {
  type        = string
  description = "SNS topic name"
}

variable "topic_display_name" {
  type        = string
  description = "SNS topic display name"
}

variable "environment" {
  type = string
}

variable "publisher_arn" {
  type        = string
  description = "AWS arn of identity publishing messages to SNS topic"
}

variable "subscriber_arns" {
  type        = map(string)
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

variable "tags" {
  type    = map(string)
  default = {}
}