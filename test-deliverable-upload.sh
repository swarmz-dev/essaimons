#!/bin/bash

# Test deliverable upload script
# Usage: ./test-deliverable-upload.sh <TOKEN>

if [ -z "$1" ]; then
    echo "Usage: $0 <AUTH_TOKEN>"
    echo "Get your token from browser console: document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]"
    exit 1
fi

TOKEN="$1"
PROPOSITION_ID="209"
MANDATE_ID="8acd9401-6a42-4cf7-a724-e4335ae86a94"
API_URL="http://localhost:3333/api"

# Create a test file
echo "Test deliverable content - $(date)" > /tmp/test-deliverable.txt

echo "Uploading deliverable..."
echo "URL: ${API_URL}/propositions/${PROPOSITION_ID}/mandates/${MANDATE_ID}/deliverables"
echo ""

curl -v -X POST \
  "${API_URL}/propositions/${PROPOSITION_ID}/mandates/${MANDATE_ID}/deliverables" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@/tmp/test-deliverable.txt" \
  -F "label=Test deliverable" \
  -F "objectiveRef=Test objective"

echo ""
echo "Done!"