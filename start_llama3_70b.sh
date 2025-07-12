#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
MODEL_MODE=api \
API_URL=https://api.openrouter.ai/v1/chat/completions \
API_MODEL=meta-llama/llama-3-70b-instruct \
bash "$DIR/switch_model.sh" api "$@"

