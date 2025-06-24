#!/bin/bash

set -e  # Exit on error
set -x  # Print commands

echo "Starting dashboard publisher..."

# Check if DD_API_KEY and DD_APP_KEY are set
if [ -z "$DD_API_KEY" ] || [ -z "$DD_APP_KEY" ]; then
    echo "Error: DD_API_KEY and DD_APP_KEY environment variables must be set"
    echo "DD_API_KEY exists: ${DD_API_KEY:+yes}"
    echo "DD_APP_KEY exists: ${DD_APP_KEY:+yes}"
    exit 1
fi

# Check if dashboard.json exists
if [ ! -f "dashboard.json" ]; then
    echo "Error: dashboard.json not found in current directory"
    ls -la
    exit 1
fi

# Read the dashboard JSON file
echo "Reading dashboard.json..."
DASHBOARD_JSON=$(cat dashboard.json)

# Validate JSON
if ! echo "$DASHBOARD_JSON" | jq . >/dev/null 2>&1; then
    echo "Error: Invalid JSON in dashboard.json"
    exit 1
fi

echo "Publishing dashboard to Datadog..."

# Create the dashboard using Datadog API
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "https://api.datadoghq.eu/api/v1/dashboard" \
    -H "Content-Type: application/json" \
    -H "DD-API-KEY: ${DD_API_KEY}" \
    -H "DD-APPLICATION-KEY: ${DD_APP_KEY}" \
    -d "${DASHBOARD_JSON}")

# Split response into body and status code
BODY=$(echo "$RESPONSE" | sed '$d')
STATUS_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$STATUS_CODE" -eq 200 ] || [ "$STATUS_CODE" -eq 201 ]; then
    echo "Dashboard published successfully!"
    echo "Response: $BODY"
else
    echo "Error publishing dashboard. Status code: $STATUS_CODE"
    echo "Response: $BODY"
    exit 1
fi 