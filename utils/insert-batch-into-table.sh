#!/usr/bin/env bash

# Ensure correct usage
if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <dynamodb_table_name> <json_file>"
  exit 1
fi

TABLE_NAME="$1"
JSON_FILE="$2"

# Check if the file exists
if [ ! -f "${JSON_FILE}" ]; then
  echo "Error: File '${JSON_FILE}' not found!"
  exit 1
fi

if ! aws dynamodb describe-table --table-name "${TABLE_NAME}" >/dev/null 2>&1; then
  echo "Error: Table '${TABLE_NAME}' not found!"
  exit 1
fi

# Check the table exists

# Read the entire JSON array into a variable
ITEMS=$(jq -c '.[]' "${JSON_FILE}")

# Convert the multi-line string into an array
mapfile -t ITEM_ARRAY <<< "${ITEMS}"

# Initialize batch array
BATCH=()
COUNTER=0

process_batch() {
  local -n batch_ref=$1  # Reference to the batch array
  local batch_size=${#batch_ref[@]}

  if [ "$batch_size" -eq 0 ]; then
    return  # Skip if the batch is empty
  fi

  echo "Processing batch of $batch_size items..."

  # Format JSON correctly for DynamoDB
  BATCH_JSON=$(printf '%s\n' "${BATCH[@]}" | jq -s --arg TABLE_NAME "$TABLE_NAME" '{ ($TABLE_NAME): [ .[] | { PutRequest: { Item: .Item } } ] }')

  # Send batch to DynamoDB
  aws dynamodb batch-write-item --request-items "$BATCH_JSON"

  # Clear batch
  batch_ref=()
}

# Process items in batches of 10
for ITEM in "${ITEM_ARRAY[@]}"; do
  BATCH+=("$ITEM")
  COUNTER=$((COUNTER + 1))

  if [ "${COUNTER}" -eq 10 ]; then
    process_batch BATCH
    COUNTER=0
  fi
done

# Process remaining items (if batch has fewer than 10 items)
if [ "$COUNTER" -gt 0 ]; then
  process_batch BATCH
fi

echo "Upload complete!"
