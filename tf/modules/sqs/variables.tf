variable "queue_name" {
  type        = string
  description = "SQS queue name"
}

variable "sender_arn" {
  type        = string
  description = "AWS arn of identity sending messages to SQS queue"
}

variable "receiver_arn" {
  type        = string
  description = "AWS arn of identity pulling messages from SQS queue"
}

variable "queue_config" {
  type = object({
    fifo                        = optional(bool, true)
    content_based_deduplication = optional(bool, true)
    message_retention_seconds   = optional(number, 345600) # 4 days
    receive_wait_time_seconds   = optional(number, 0)
    visibility_timeout_seconds  = optional(number, 30)
  })
  default = {
    fifo                        = true
    content_based_deduplication = true
  }

  validation {
    condition     = var.queue_config.message_retention_seconds >= 60 && var.queue_config.message_retention_seconds <= 345600
    error_message = "Queue message_retention_seconds must be within 60 and 345600."
  }

  validation {
    condition     = var.queue_config.receive_wait_time_seconds >= 0 && var.queue_config.receive_wait_time_seconds <= 20
    error_message = "Queue receive_wait_time_seconds must be within 0 and 20."
  }

  validation {
    condition     = var.queue_config.visibility_timeout_seconds >= 0 && var.queue_config.visibility_timeout_seconds <= 43200
    error_message = "Queue visibility_timeout_seconds must be within 0 and 43200."
  }
}

variable "redrive_policy" {
  type = object({
    max_receive_count      = number
    dead_letter_target_arn = string
  })

  default = null
}

variable "tags" {
  type    = map(string)
  default = {}
}
