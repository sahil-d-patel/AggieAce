#!/bin/bash
# AggieAce Complete Setup Script - macOS/Linux
# This script automates the entire installation and configuration process

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script and project directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check version
check_version() {
    local cmd=$1
    local required=$2
    local version=$($cmd 2>&1 | head -n1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
    echo "$version"
}

print_status "Starting AggieAce Setup..."
echo ""

# =============================================================================
# Step 1: Check Prerequisites
# =============================================================================
print_status "Checking prerequisites..."
echo ""

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version | grep -oE '[0-9]+' | head -1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        print_success "Node.js $(node --version) found"
    else
        print_error "Node.js version must be 18 or higher. Found: $(node --version)"
        exit 1
    fi
else
    print_error "Node.js not found. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check npm
if command_exists npm; then
    print_success "npm $(npm --version) found"
else
    print_error "npm not found. Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check Python
if command_exists python3; then
    PYTHON_VERSION=$(python3 --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
    print_success "Python $(python3 --version) found"
else
    print_error "Python 3 not found. Please install Python 3.8+ from https://www.python.org/"
    exit 1
fi

# Check pip
if command_exists pip3; then
    print_success "pip3 $(pip3 --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1) found"
else
    print_error "pip3 not found. Please install pip3 (usually comes with Python)"
    exit 1
fi

# Check PostgreSQL
if command_exists psql; then
    print_success "PostgreSQL $(psql --version | grep -oE '[0-9]+\.[0-9]+' | head -1) found"
else
    print_error "PostgreSQL not found. Please install PostgreSQL 14+ from https://www.postgresql.org/"
    exit 1
fi

# Check LibreOffice (optional but recommended)
if command_exists soffice; then
    print_success "LibreOffice found"
    LIBREOFFICE_INSTALLED=true
elif command_exists libreoffice; then
    print_success "LibreOffice found"
    LIBREOFFICE_INSTALLED=true
else
    print_warning "LibreOffice not found. DOCX conversion will not be available."
    print_warning "Install from: https://www.libreoffice.org/ or 'brew install --cask libreoffice'"
    LIBREOFFICE_INSTALLED=false
fi

echo ""

# =============================================================================
# Step 2: Install Node.js Dependencies
# =============================================================================
print_status "Installing Node.js dependencies..."
echo ""

cd "$PROJECT_ROOT"

# Install root dependencies
if [ -f "package.json" ]; then
    print_status "Installing root dependencies..."
    npm install
    print_success "Root dependencies installed"
fi

# Install backend dependencies
if [ -d "backend" ] && [ -f "backend/package.json" ]; then
    print_status "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    print_success "Backend dependencies installed"
fi

# Install frontend dependencies
if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
    print_status "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    print_success "Frontend dependencies installed"
fi

echo ""

# =============================================================================
# Step 3: Install Python Dependencies
# =============================================================================
print_status "Installing Python dependencies..."
echo ""

if [ -f "backend/requirements.txt" ]; then
    cd "$PROJECT_ROOT/backend"
    pip3 install -r requirements.txt
    print_success "Python dependencies installed"
    cd "$PROJECT_ROOT"
else
    print_warning "requirements.txt not found, skipping Python dependencies"
fi

echo ""

# =============================================================================
# Step 4: Create .env Configuration File
# =============================================================================
print_status "Setting up environment configuration..."
echo ""

ENV_FILE="$PROJECT_ROOT/backend/.env"
ENV_EXAMPLE="$PROJECT_ROOT/backend/.env.example"

if [ -f "$ENV_FILE" ]; then
    print_warning ".env file already exists"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Keeping existing .env file"
        SKIP_ENV=true
    else
        SKIP_ENV=false
    fi
else
    SKIP_ENV=false
fi

if [ "$SKIP_ENV" = false ]; then
    if [ -f "$ENV_EXAMPLE" ]; then
        cp "$ENV_EXAMPLE" "$ENV_FILE"
        print_success "Created .env file from template"

        # Generate secure JWT secret
        JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')

        # Update JWT_SECRET in .env
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/your_jwt_secret_key_minimum_32_characters_long_here/$JWT_SECRET/" "$ENV_FILE"
        else
            # Linux
            sed -i "s/your_jwt_secret_key_minimum_32_characters_long_here/$JWT_SECRET/" "$ENV_FILE"
        fi

        print_success "Generated secure JWT secret"

        echo ""
        print_status "Please provide the following configuration values:"
        echo ""

        # Prompt for Gemini API Key
        read -p "Enter your Google Gemini API Key (get from https://aistudio.google.com/app/apikey): " GEMINI_KEY
        if [ -n "$GEMINI_KEY" ]; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/your_gemini_api_key_here/$GEMINI_KEY/" "$ENV_FILE"
            else
                sed -i "s/your_gemini_api_key_here/$GEMINI_KEY/" "$ENV_FILE"
            fi
            print_success "Gemini API key configured"
        fi

        # Prompt for PostgreSQL credentials
        read -p "Enter PostgreSQL username (default: postgres): " DB_USER
        DB_USER=${DB_USER:-postgres}

        read -sp "Enter PostgreSQL password: " DB_PASSWORD
        echo ""

        read -p "Enter database name (default: aggieace): " DB_NAME
        DB_NAME=${DB_NAME:-aggieace}

        # Update database credentials
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/DB_USER=postgres/DB_USER=$DB_USER/" "$ENV_FILE"
            sed -i '' "s/your_postgres_password_here/$DB_PASSWORD/" "$ENV_FILE"
            sed -i '' "s/DB_NAME=aggieace/DB_NAME=$DB_NAME/" "$ENV_FILE"
        else
            sed -i "s/DB_USER=postgres/DB_USER=$DB_USER/" "$ENV_FILE"
            sed -i "s/your_postgres_password_here/$DB_PASSWORD/" "$ENV_FILE"
            sed -i "s/DB_NAME=aggieace/DB_NAME=$DB_NAME/" "$ENV_FILE"
        fi

        print_success "Database credentials configured"

        # Optional: Google OAuth
        echo ""
        read -p "Do you want to configure Google OAuth now? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            read -p "Enter Google Client ID: " GOOGLE_CLIENT_ID
            read -p "Enter Google Client Secret: " GOOGLE_CLIENT_SECRET

            if [ -n "$GOOGLE_CLIENT_ID" ] && [ -n "$GOOGLE_CLIENT_SECRET" ]; then
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    sed -i '' "s/your_google_client_id_here/$GOOGLE_CLIENT_ID/" "$ENV_FILE"
                    sed -i '' "s/your_google_client_secret_here/$GOOGLE_CLIENT_SECRET/" "$ENV_FILE"
                else
                    sed -i "s/your_google_client_id_here/$GOOGLE_CLIENT_ID/" "$ENV_FILE"
                    sed -i "s/your_google_client_secret_here/$GOOGLE_CLIENT_SECRET/" "$ENV_FILE"
                fi
                print_success "Google OAuth configured"
            fi
        else
            print_status "Skipping Google OAuth (you can configure it later in .env)"
        fi

    else
        print_error ".env.example not found!"
        exit 1
    fi
fi

echo ""

# =============================================================================
# Step 5: Create PostgreSQL Database
# =============================================================================
print_status "Setting up PostgreSQL database..."
echo ""

# Source the DB credentials from .env
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | grep 'DB_' | xargs)
fi

# Check if database exists
DB_EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -h localhost -U "$DB_USER" -lqt 2>/dev/null | cut -d \| -f 1 | grep -w "$DB_NAME" | wc -l)

if [ "$DB_EXISTS" -eq 0 ]; then
    print_status "Creating database '$DB_NAME'..."
    PGPASSWORD=$DB_PASSWORD psql -h localhost -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || {
        print_error "Failed to create database. Please ensure PostgreSQL is running and credentials are correct."
        print_status "You can create the database manually with: psql -U $DB_USER -c 'CREATE DATABASE $DB_NAME;'"
        exit 1
    }
    print_success "Database '$DB_NAME' created"
else
    print_success "Database '$DB_NAME' already exists"
fi

echo ""

# =============================================================================
# Step 6: Initialize Database Schema
# =============================================================================
print_status "Initializing database schema..."
echo ""

cd "$PROJECT_ROOT/backend"

if [ -f "scripts/setup-db.js" ]; then
    node scripts/setup-db.js || {
        print_error "Database initialization failed"
        print_status "You can run it manually later with: cd backend && node scripts/setup-db.js"
    }
else
    print_warning "Database setup script not found, skipping schema initialization"
fi

cd "$PROJECT_ROOT"

echo ""

# =============================================================================
# Setup Complete
# =============================================================================
print_success "╔════════════════════════════════════════════════════════════════╗"
print_success "║             AggieAce Setup Complete! 🎉                        ║"
print_success "╚════════════════════════════════════════════════════════════════╝"
echo ""
print_status "Next steps:"
echo ""
echo "  1. Review your configuration in backend/.env"
echo "  2. Start the application with: ./setupScripts/start.sh"
echo "     or: npm run dev"
echo ""
echo "  The application will be available at:"
echo "    • Frontend: http://localhost:3000"
echo "    • Backend:  http://localhost:5000"
echo ""

if [ "$LIBREOFFICE_INSTALLED" = false ]; then
    print_warning "Remember: LibreOffice is not installed. DOCX conversion will not work."
    echo "           Install with: brew install --cask libreoffice"
    echo ""
fi

print_status "For help, see README.md or run: npm run dev"
echo ""
