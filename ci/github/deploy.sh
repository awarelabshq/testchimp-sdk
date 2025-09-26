#!/bin/bash

# TestChimp GitHub Action Deployment Script
# This script helps deploy the action to a new repository

set -e

# Configuration
REPO_NAME="testchimp-github-action"
ORG_NAME="testchimp"  # Change this to your organization
VERSION="1.0.0"

echo "🚀 Deploying TestChimp GitHub Action v$VERSION"

# Check if we're in the right directory
if [ ! -f "action.yml" ]; then
    echo "❌ Error: action.yml not found. Please run this script from the action directory."
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📁 Initializing git repository..."
    git init
fi

# Build the action
echo "🔨 Building the action..."
npm run build

# Check if build was successful
if [ ! -f "dist/index.js" ]; then
    echo "❌ Error: Build failed. dist/index.js not found."
    exit 1
fi

echo "✅ Build successful"

# Add all files
echo "📝 Adding files to git..."
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "ℹ️ No changes to commit"
else
    echo "💾 Committing changes..."
    git commit -m "TestChimp GitHub Action v$VERSION

Features:
- AI-powered test repair
- Configurable success criteria
- Pull request integration
- Comprehensive reporting
- CI/CD integration

Breaking Changes:
- Requires api-key and project-id parameters
- Updated output parameters for repair statistics"
fi

# Check if remote is set up
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "🔗 Setting up remote repository..."
    git remote add origin "https://github.com/$ORG_NAME/$REPO_NAME.git"
fi

# Push to main branch
echo "📤 Pushing to main branch..."
git push origin main

# Create and push tag
echo "🏷️ Creating tag v$VERSION..."
git tag -a "v$VERSION" -m "TestChimp GitHub Action v$VERSION"
git push origin "v$VERSION"

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Go to https://github.com/$ORG_NAME/$REPO_NAME"
echo "2. Click 'Releases' → 'Create a new release'"
echo "3. Select tag 'v$VERSION'"
echo "4. Add release notes and publish"
echo ""
echo "🎯 Clients can now use your action with:"
echo "   uses: $ORG_NAME/$REPO_NAME@v$VERSION"
echo ""
echo "📖 Don't forget to:"
echo "- Update the README.md with your organization name"
echo "- Set up GitHub Pages for documentation (optional)"
echo "- Consider publishing to GitHub Marketplace"
