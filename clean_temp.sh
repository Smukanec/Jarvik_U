#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR" || exit

# Remove Python cache folders and bytecode files
echo "🧹 Removing temporary Python artifacts..."
find . -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null
find . -name '*.pyc' -delete

echo "✅ Temporary files removed."
