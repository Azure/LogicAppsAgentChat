#!/bin/bash

# Script to fix pnpm-lock.yaml issues

set -e

echo "🔧 Fixing pnpm-lock.yaml..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install it first:"
    echo "   npm install -g pnpm"
    exit 1
fi

# Remove existing lockfile to start fresh
if [ -f "pnpm-lock.yaml" ]; then
    echo "📋 Backing up existing pnpm-lock.yaml to pnpm-lock.yaml.backup"
    cp pnpm-lock.yaml pnpm-lock.yaml.backup
    rm pnpm-lock.yaml
fi

# Clean pnpm store cache
echo "🧹 Cleaning pnpm store..."
pnpm store prune

# Remove node_modules
echo "🗑️  Removing node_modules directories..."
find . -name "node_modules" -type d -prune -exec rm -rf '{}' +

# Generate fresh lockfile
echo "📦 Installing dependencies and generating fresh lockfile..."
pnpm install

# Verify the lockfile
echo "✅ Verifying lockfile with frozen install..."
if pnpm install --frozen-lockfile; then
    echo "✅ Lockfile is valid and in sync!"
    echo ""
    echo "Next steps:"
    echo "1. Review the changes: git diff pnpm-lock.yaml"
    echo "2. Commit the updated lockfile: git add pnpm-lock.yaml && git commit -m 'fix: update pnpm-lock.yaml'"
    echo "3. Push your changes"
    
    # Clean up backup if everything succeeded
    if [ -f "pnpm-lock.yaml.backup" ]; then
        rm pnpm-lock.yaml.backup
    fi
else
    echo "❌ Failed to verify lockfile. There might be an issue with dependencies."
    if [ -f "pnpm-lock.yaml.backup" ]; then
        echo "You can restore the backup with: mv pnpm-lock.yaml.backup pnpm-lock.yaml"
    fi
    exit 1
fi