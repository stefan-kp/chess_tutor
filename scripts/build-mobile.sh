#!/bin/bash

# Mobile build script
# Temporarily moves API folder outside src/, builds static export, then restores it

set -e

# Always restore the API folder, even if the build fails, so a failed run
# never leaves the working tree with src/app/api missing.
restore_api() {
  if [ -d ".api_temp_mobile_build" ]; then
    echo "📦 Restoring API routes..."
    mv .api_temp_mobile_build src/app/api
  fi
}
trap restore_api EXIT

echo "🔧 Preparing mobile build..."

# Clean previous build (suppress errors for non-empty directories)
echo "🧹 Cleaning previous build..."
rm -rf .next out 2>/dev/null || true

# Backup API folder to temp location OUTSIDE src/
if [ -d "src/app/api" ]; then
  echo "📦 Temporarily moving API routes outside src/..."
  mv src/app/api .api_temp_mobile_build
fi

# Build with mobile configuration
echo "🏗️  Building static export for mobile..."
BUILD_TARGET=mobile NEXT_PUBLIC_USE_REMOTE_ENGINE=true next build

echo "✅ Mobile build complete! Output in ./out"
