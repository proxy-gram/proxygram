#!/bin/bash

# Check if PACKAGE_NAME and PACKAGE_VERSION are set
if [ -z "$PACKAGE_NAME" ] || [ -z "$PACKAGE_VERSION" ]; then
  echo "Error: PACKAGE_NAME or PACKAGE_VERSION is not set."
  exit 1
fi

# Find and replace in all .yaml files in the current directory and subdirectories
find . -type f -name "*.yml" | while read -r FILE; do
  echo "Updating $FILE"
  sed -i "s|ghcr.io/proxy-gram/${PACKAGE_NAME}:.*|ghcr.io/proxy-gram/${PACKAGE_NAME}:${PACKAGE_VERSION}|g" "$FILE"
done
