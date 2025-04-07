#!/bin/bash

# Configuration
API_BASE_URL="http://localhost:8080"
API_PASSWORD="e208af72a86c45945d31ac18f0007620"  # This is the default API password

# Check if a custom API password is provided
if [ "$1" != "" ]; then
  API_PASSWORD="$1"
fi

echo "Fetching all alerts from the system..."

# Fetch all alert IDs
ALERTS_RESPONSE=$(curl -s "${API_BASE_URL}/alerts?password=${API_PASSWORD}&limit=1000")

# Check if jq is available to parse JSON
if ! command -v jq &> /dev/null; then
  echo "Error: jq is required to parse the API response"
  echo "Please install jq or modify this script to parse JSON manually"
  exit 1
fi

# Extract alert IDs and count from the response
ALERT_IDS=($(echo $ALERTS_RESPONSE | jq -r '.data[].alert.id'))
TOTAL_ALERTS=${#ALERT_IDS[@]}

if [ $TOTAL_ALERTS -eq 0 ]; then
  echo "No alerts found in the system"
  exit 0
fi

echo "Found $TOTAL_ALERTS alerts. Starting deletion..."

# Counter for successful deletions
SUCCESS_COUNT=0

# Delete each alert
for ID in "${ALERT_IDS[@]}"; do
  echo "Deleting alert $ID..."
  
  DELETE_RESPONSE=$(curl -s -X DELETE "${API_BASE_URL}/alerts/${ID}?password=${API_PASSWORD}" \
    -H "Content-Type: application/json")
  
  # Check if deletion was successful
  if [[ "$DELETE_RESPONSE" == *"\"status\":\"success\""* || "$DELETE_RESPONSE" == *"\"success\":true"* ]]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    echo "✅ Alert $ID deleted successfully"
  else
    ERROR=$(echo $DELETE_RESPONSE | jq -r '.error // "Unknown error"')
    echo "❌ Failed to delete alert $ID: $ERROR"
  fi
done

# Print summary
echo "----------------------------------------"
echo "Deletion complete: $SUCCESS_COUNT/$TOTAL_ALERTS alerts deleted successfully"

if [ $SUCCESS_COUNT -eq $TOTAL_ALERTS ]; then
  echo "✅ All alerts were successfully deleted"
else
  echo "⚠️ Some alerts could not be deleted"
  exit 1
fi

echo "Done!"