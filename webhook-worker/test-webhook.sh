#!/bin/bash

# Test script for the webhook worker
# Usage: ./test-webhook.sh [worker-url]
# Example: ./test-webhook.sh https://framer-webhook.your-subdomain.workers.dev

WORKER_URL=${1:-"http://localhost:8787"}

echo "🧪 Testing webhook at: $WORKER_URL"
echo ""

# Test 1: JSON payload (most common for Framer)
echo "Test 1: Sending JSON payload..."
curl -X POST "$WORKER_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@framer.com",
    "location": "San Francisco"
  }' \
  -w "\n\nStatus: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || cat

echo ""
echo "---"
echo ""

# Test 2: Form-encoded payload
echo "Test 2: Sending form-encoded payload..."
curl -X POST "$WORKER_URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "name=John Doe&email=john@example.com&location=New York" \
  -w "\n\nStatus: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || cat

echo ""
echo "✅ Tests complete! Check the worker logs to see the received data."

