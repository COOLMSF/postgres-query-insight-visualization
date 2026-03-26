#!/bin/bash
#
# Install pg_query_optimizer_tracer PostgreSQL extension
# This script compiles and installs the C extension into PostgreSQL
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTENSION_DIR="$SCRIPT_DIR/pg_extension"
PG_CONFIG="${PG_CONFIG:-pg_config}"

echo "=============================================="
echo "  PG Query Optimizer Tracer Extension Installer"
echo "=============================================="
echo ""

# Check if pg_config is available
if ! command -v $PG_CONFIG &> /dev/null; then
    echo "Error: pg_config not found. Please install PostgreSQL development packages."
    echo ""
    echo "On Ubuntu/Debian:"
    echo "  sudo apt-get install postgresql-server-dev-14"
    echo ""
    echo "On CentOS/RHEL:"
    echo "  sudo yum install postgresql-devel"
    echo ""
    echo "On macOS with Homebrew:"
    echo "  brew install postgresql"
    exit 1
fi

# Get PostgreSQL version
PG_VERSION=$($PG_CONFIG --version)
echo "✓ Detected: $PG_VERSION"

# Check PostgreSQL version >= 14
PG_MAJOR_VERSION=$($PG_CONFIG --version | awk '{print $2}' | cut -d. -f1)
if [ "$PG_MAJOR_VERSION" -lt 14 ]; then
    echo "Error: PostgreSQL 14 or higher is required. Found version $PG_MAJOR_VERSION"
    exit 1
fi
echo "✓ PostgreSQL version check passed (>= 14)"

# Check for PostgreSQL development headers
PG_INCLUDEDIR_SERVER=$($PG_CONFIG --includedir-server)
if [ ! -d "$PG_INCLUDEDIR_SERVER" ]; then
    echo "Error: PostgreSQL server development headers not found at $PG_INCLUDEDIR_SERVER"
    echo "Please install postgresql-server-dev-$PG_MAJOR_VERSION (Debian/Ubuntu)"
    echo "or postgresql-devel (CentOS/RHEL)"
    exit 1
fi
echo "✓ PostgreSQL development headers found: $PG_INCLUDEDIR_SERVER"

# Navigate to extension directory
cd "$EXTENSION_DIR"

echo ""
echo "Building extension..."
echo "----------------------------------------------"

# Clean previous build
if [ -f "Makefile" ]; then
    make clean 2>/dev/null || true
fi

# Compile the extension
make USE_PGXS=1

if [ $? -eq 0 ]; then
    echo "✓ Extension compiled successfully"
else
    echo "✗ Compilation failed"
    exit 1
fi

echo ""
echo "Installing extension..."
echo "----------------------------------------------"

# Install the extension (requires sudo)
if [ -w "$($PG_CONFIG --pkglibdir)" ]; then
    make USE_PGXS=1 install
    echo "✓ Extension installed to $($PG_CONFIG --pkglibdir)"
else
    echo "Installing to system directory requires root privileges..."
    sudo make USE_PGXS=1 install
    if [ $? -eq 0 ]; then
        echo "✓ Extension installed to $($PG_CONFIG --pkglibdir)"
    else
        echo "✗ Installation failed"
        exit 1
    fi
fi

# Get the database to install extension in
TARGET_DB="${1:-postgres}"

echo ""
echo "Installing extension into database: $TARGET_DB"
echo "----------------------------------------------"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "Warning: psql not found. Skipping database installation."
    echo "You can manually install the extension later with:"
    echo "  CREATE EXTENSION pg_query_optimizer_tracer;"
    exit 0
fi

# Install extension in database
if psql -d "$TARGET_DB" -c "CREATE EXTENSION IF NOT EXISTS pg_query_optimizer_tracer;" 2>/dev/null; then
    echo "✓ Extension created in database '$TARGET_DB'"
else
    echo "Warning: Could not create extension in database '$TARGET_DB'"
    echo "You may need to run this script with appropriate database credentials"
    echo "Example: sudo -u postgres $0"
fi

echo ""
echo "=============================================="
echo "  Installation Complete!"
echo "=============================================="
echo ""
echo "To use the extension in a database, run:"
echo "  CREATE EXTENSION pg_query_optimizer_tracer;"
echo ""
echo "To enable tracing:"
echo "  SELECT pg_tracer_enable();"
echo ""
echo "To check if tracer is enabled:"
echo "  SELECT pg_tracer_is_enabled();"
echo ""
echo "To view trace sessions:"
echo "  SELECT * FROM pg_trace_sessions_view;"
echo ""
