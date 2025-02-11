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
  })
  default = {
    fifo                        = true
    content_based_deduplication = true
  }
}

variable "redrive_policy" {
  type = object({
    max_receive_count = number
    dead_letter_target_arn = string
  })

  default = null
}

variable "tags" {
  type    = map(string)
  default = {}
}
