#!/bin/bash
# Clear Cache - macOS/Linux
# Clears the syllabus cache from the database (syllabus_cache table)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT/backend"
node scripts/clear-cache.js
