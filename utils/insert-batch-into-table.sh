#!/usr/bin/env bash

# Ensure correct usage
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <dynamodb_table_name> <json_file>"
    exit 1
fi

TABLE_NAME="$1"
JSON_FILE="$2"

# Check if the file exists
if [ ! -f "$JSON_FILE" ]; then
    echo "Error: File '$JSON_FILE' not found!"
    exit 1
fi

# Check the table exists

# Read the entire JSON array into a variable
ITEMS=$(jq -c '.[]' "$JSON_FILE")

# Convert the multi-line string into an array
mapfile -t ITEM_ARRAY <<< "$ITEMS"

# Initialize batch array
BATCH=()
COUNTER=0


# Process items in batches of 10
for ITEM in "${ITEM_ARRAY[@]}"; do
    BATCH+=("$ITEM")
    COUNTER=$((COUNTER + 1))

    if [ "$COUNTER" -eq 10 ]; then
        echo "Processing batch of 10 items..."

        # Format JSON correctly for DynamoDB
        BATCH_JSON=$(printf '%s\n' "${BATCH[@]}" | jq -s --arg TABLE_NAME "$TABLE_NAME" '{ ($TABLE_NAME): [ .[] | { PutRequest: { Item: .Item } } ] }')

        # Send batch to DynamoDB
        aws dynamodb batch-write-item --request-items "$BATCH_JSON"

        # Reset batch
        BATCH=()
        COUNTER=0
    fi
done

# Process remaining items (if batch has fewer than 10 items)
if [ "$COUNTER" -gt 0 ]; then
    echo "Processing final batch of $COUNTER items..."

    BATCH_JSON=$(printf '%s\n' "${BATCH[@]}" | jq -s --arg TABLE_NAME "$TABLE_NAME" '{ ($TABLE_NAME): [ .[] | { PutRequest: { Item: .Item } } ] }')

    echo "${BATCH_JSON}" > foo.json

    aws dynamodb batch-write-item --request-items "$BATCH_JSON"
fi

echo "Upload complete!"
