locals {
  audit_trail_subscription = {
    arn           = module.audit_trail_queue.sqs_queue_arn
    filter_policy = null
  }
}
