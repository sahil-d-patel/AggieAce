#!/bin/bash
# Clear User Data - macOS/Linux
# Clears all user data from the database (users and calendar_history tables)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT/backend"
node scripts/clear-user-data.js
