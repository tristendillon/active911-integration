#!/bin/bash

# Set the base URL - change this to match your API endpoint
BASE_URL="https://252d-2600-8803-2b1e-9200-58df-de2c-b763-365b.ngrok-free.app/api/alerts"

# Helper function to run a test and report results
run_test() {
  local test_name=$1
  local json_file=$2

  echo "=== Running Test: $test_name ==="
  echo "Request payload:"
  cat $json_file | jq '.'

  # Make the request (without gzip compression)
  echo "Sending request..."
  response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    --data-binary @${json_file} \
    $BASE_URL)

  # Extract status code and response body
  status_code=$(echo "$response" | tail -n1)
  response_body=$(echo "$response" | sed '$d')

  echo "Status code: $status_code"
  echo "Response:"
  echo $response_body | jq '.' 2>/dev/null || echo $response_body

  # Extract alert ID from response for later deletion
  alert_id=$(echo $response_body | jq -r '.alert.id' 2>/dev/null)
  if [ "$alert_id" != "null" ] && [ "$alert_id" != "" ]; then
    echo "Alert ID for later deletion: $alert_id"
    echo $alert_id >> created_alert_ids.txt
  fi

  echo ""
}

# Helper function to delete an alert
delete_alert() {
  local alert_id=$1

  echo "=== Deleting Alert: $alert_id ==="

  # Make the delete request
  response=$(curl -s -w "\n%{http_code}" -X DELETE \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    $BASE_URL/$alert_id)

  # Extract status code and response body
  status_code=$(echo "$response" | tail -n1)
  response_body=$(echo "$response" | sed '$d')

  echo "Status code: $status_code"
  echo "Response:"
  echo $response_body | jq '.' 2>/dev/null || echo $response_body
  echo ""
}

# Create a file to store alert IDs
> created_alert_ids.txt

# Optional: Delete existing alert with ID 999999999 before starting tests
echo "=== Pre-test cleanup: Deleting alert with ID 999999999 if it exists ==="
curl -s -X DELETE -H "Content-Type: application/json" -H "Accept: application/json" $BASE_URL/999999999
echo ""

# ======== TEST 1: Standard valid alert ========
echo '{
  "agency": {
    "name": "Corvallis Fire Department",
    "id": 99999,
    "timezone": "America/Los_Angeles"
  },
  "alert": {
    "id": "999999999",
    "normalized_message": {
      "city": "Corvallis",
      "coordinate_source": "google",
      "cross_street": "",
      "description": "",
      "details": "Standard fire alarm at research facility",
      "lat": -123.296392,
      "lon": 44.550964,
      "map_address": "4100 SW Research Way",
      "map_code": "",
      "place": "",
      "priority": "high",
      "received": "1570054351",
      "source": "",
      "state": "OR",
      "unit": "",
      "units": "11"
    },
    "pagegroups": ["0"],
    "stamp": 1570054351.43062
  }
}' > test1.json

run_test "Standard Valid Alert" "test1.json"

# ======== TEST 2: Missing required fields (agency name) ========
echo '{
  "agency": {
    "id": 99999,
    "timezone": "America/Los_Angeles"
  },
  "alert": {
    "id": "888888888",
    "normalized_message": {
      "city": "Corvallis",
      "details": "Missing agency name test",
      "lat": -123.296392,
      "lon": 44.550964,
      "map_address": "4100 SW Research Way"
    },
    "state": "OR",
    "units": "11",
    "stamp": 1570054351.43062
  }
}' > test2.json

run_test "Missing Required Fields" "test2.json"

# ======== TEST 3: Very large payload with extended details ========
echo '{
  "agency": {
    "name": "Corvallis Emergency Services",
    "id": 99999,
    "timezone": "America/Los_Angeles",
    "additional_info": {
      "contact_number": "541-555-1234",
      "headquarters": "123 Main Street",
      "dispatch_codes": ["A1", "B2", "C3", "D4"],
      "staff": [
        {"name": "John Smith", "role": "Chief", "badge": "1001"},
        {"name": "Sarah Johnson", "role": "Lieutenant", "badge": "1002"},
        {"name": "Michael Williams", "role": "Officer", "badge": "1003"}
      ],
      "coverage_area": "25 square miles",
      "founding_year": 1952
    }
  },
  "alert": {
    "id": "777777777",
    "normalized_message": {
      "city": "Corvallis",
      "coordinate_source": "google",
      "cross_street": "SW Campus Way",
      "description": "Structural fire with potential hazardous materials",
      "details": "Extended description of incident with multiple paragraphs and details that would require a large text field",
      "lat": -123.296392,
      "lon": 44.550964,
      "map_address": "4100 SW Research Way",
      "map_code": "F-12-34",
      "place": "University Research Building",
      "priority": "critical",
      "received": "1570054351",
      "source": "911 Call",
      "state": "OR",
      "unit": "Station 5",
      "units": "11,12,13,14,15"
    },
    "pagegroups": ["0", "1", "2", "3", "4", "5"],
    "stamp": 1570054351.43062,
    "weather_conditions": {
      "temperature": 72,
      "wind_speed": 5,
      "wind_direction": "NW",
      "humidity": 65,
      "precipitation": "none"
    },
    "responders": [
      {"id": "R101", "eta": "3 minutes", "status": "en route"},
      {"id": "R102", "eta": "5 minutes", "status": "dispatched"},
      {"id": "R103", "eta": "7 minutes", "status": "preparing"}
    ],
    "historical_incidents": [
      {"date": "2023-01-15", "type": "minor fire", "resolved_in": "45 minutes"},
      {"date": "2022-11-03", "type": "smoke alarm", "resolved_in": "20 minutes"}
    ]
  }
}' > test3.json

run_test "Very Large Payload" "test3.json"

# ======== TEST 4: Special characters and Unicode ========
echo '{
  "agency": {
    "name": "Département d'\''urgence de Corvallis 🚒",
    "id": 99999,
    "timezone": "America/Los_Angeles"
  },
  "alert": {
    "id": "666666666",
    "normalized_message": {
      "city": "Corvallis",
      "coordinate_source": "google",
      "cross_street": "",
      "description": "Test with special characters: & < > \" '\'' % $ # @ ! ?",
      "details": "Unicode test: 日本語 Русский العربية Español 한국어\nLine breaks\tTabs and   multiple   spaces",
      "lat": -123.296392,
      "lon": 44.550964,
      "map_address": "4100 SW Research Way\nBuilding 3, Floor 2",
      "map_code": "",
      "place": "José'\''s Café & Bakery",
      "priority": "",
      "received": "1570054351",
      "source": "",
      "state": "OR",
      "unit": "",
      "units": "11"
    },
    "pagegroups": ["0"],
    "stamp": 1570054351.43062
  }
}' > test4.json

run_test "Special Characters and Unicode" "test4.json"

# ======== TEST 5: JSON that previously would be fixed by gzip compression ========
echo '{
  "agency": {
    "name": "Corvallis Fire Department",
    "id": 99999,
    "timezone": "America/Los_Angeles"
  },
  "alert": {
    "id": "555555555",
    "normalized_message": {
      "city": "Corvallis",
      "details": "Test with syntactically corrected JSON",
      "lat": -123.296392,
      "lon": 44.550964,
      "map_address": "4100 SW Research Way"
    },
    "state": "OR"
  }
}' > test5.json

run_test "Error Handling (Fixed Malformed JSON)" "test5.json"

# ======== TEST 6: Test DELETE endpoint ========
echo "=== Running Test: Delete Alert ==="
# Generate a random ID for a new alert to test delete
RANDOM_ID="$(date +%s)$(shuf -i 1000-9999 -n 1)"

# Create an alert with the random ID
echo '{
  "agency": {
    "name": "Delete Test Agency",
    "id": 99999,
    "timezone": "America/Los_Angeles"
  },
  "alert": {
    "id": "'$RANDOM_ID'",
    "normalized_message": {
      "city": "Corvallis",
      "details": "This alert will be deleted",
      "lat": -123.296392,
      "lon": 44.550964,
      "map_address": "4100 SW Research Way"
    },
    "stamp": 1570054351.43062,
    "state": "OR"
  }
}' > test_delete.json

# Create the alert
echo "Creating alert for deletion test..."
response=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  --data-binary @test_delete.json \
  $BASE_URL)

status_code=$(echo "$response" | tail -n1)
response_body=$(echo "$response" | sed '$d')

echo "Creation status code: $status_code"
echo "Creation response:"
echo $response_body | jq '.' 2>/dev/null || echo $response_body
echo ""

# Extract the ID from the response (or use the random ID if extraction fails)
delete_id=$(echo $response_body | jq -r '.alert.id' 2>/dev/null)
if [ "$delete_id" = "null" ] || [ -z "$delete_id" ]; then
  delete_id=$RANDOM_ID
fi

echo "Deleting alert with ID: $delete_id"
# Now delete the alert
delete_response=$(curl -s -w "\n%{http_code}" -X DELETE \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  $BASE_URL/$delete_id)

# Extract status code and response body
delete_status=$(echo "$delete_response" | tail -n1)
delete_body=$(echo "$delete_response" | sed '$d')

echo "Delete status code: $delete_status"
echo "Delete response:"
echo $delete_body | jq '.' 2>/dev/null || echo $delete_body
echo ""

# ======== TEST 7: Delete Non-Existent Alert ========
echo "=== Running Test: Delete Non-Existent Alert ==="
NON_EXISTENT_ID="999999000"

delete_response=$(curl -s -w "\n%{http_code}" -X DELETE \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  $BASE_URL/$NON_EXISTENT_ID)

# Extract status code and response body
delete_status=$(echo "$delete_response" | tail -n1)
delete_body=$(echo "$delete_response" | sed '$d')

echo "Delete status code: $delete_status"
echo "Delete response:"
echo $delete_body | jq '.' 2>/dev/null || echo $delete_body
echo ""

# Delete all alerts created during testing
if [ -f created_alert_ids.txt ]; then
  echo "=== Cleaning up created alerts ==="
  while read -r id; do
    if [ ! -z "$id" ]; then
      delete_alert "$id"
    fi
  done < created_alert_ids.txt
  rm created_alert_ids.txt
fi

# Clean up remaining files
rm test1.json test2.json test3.json test4.json test5.json test_delete.json

echo "All tests completed."