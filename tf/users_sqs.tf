resource "aws_sqs_queue" "users" {
  # FIFO queues need the `.fifo` suffix, otherwise AWS will complain about the name
  name = "users-${var.environment}.fifo"

  # Using a fifo queue as it guarantees exactly-once processing
  # https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html
  fifo_queue = true

  # When ContentBasedDeduplication is in effect, messages with identical
  # content sent within the deduplication interval are treated as duplicates
  # and only one copy of the message is delivered.
  # The interval is 5 minutes and cannot be changed.
  content_based_deduplication = true

  # Any message that is sent to the queue remains invisible to consumers
  # for the duration of this delay period.
  delay_seconds = 90

  # It determines the duration during which a message remains invisible to
  # other consumers after it has been retrieved by a consumer.
  # visibility_timeout = 30

  # This argument is useful to provide a time period that a request could
  # wait for a message to become available in the queue. If no messages are
  # available within this time, the request will return an empty response.
  receive_wait_time_seconds = 10

  max_message_size = 2048

  # If the lambda runs every X minutes, then we should be OK discarding messages after
  # that time? 
  message_retention_seconds = 86400 # 24h right now
}
