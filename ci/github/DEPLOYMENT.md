# TestChimp GitHub Action - Deployment Guide

This guide explains how to deploy the TestChimp GitHub Action so your clients can use it in their repositories.

## Prerequisites

- A GitHub organization or user account to publish the action
- Node.js and npm installed
- Git configured with appropriate permissions

## Deployment Steps

### 1. Create a New Repository

Create a new public repository on GitHub for your action:

```bash
# Create a new repository on GitHub (via web interface or GitHub CLI)
gh repo create testchimp-github-action --public --description "TestChimp AI-powered test repair for GitHub Actions"
```

### 2. Initialize the Repository

```bash
# Clone the repository
git clone https://github.com/YOUR_ORG/testchimp-github-action.git
cd testchimp-github-action

# Copy the action files from your local development
cp -r /path/to/runner-action/* .
cp -r /path/to/runner-action/.* . 2>/dev/null || true

# Commit and push
git add .
git commit -m "Initial TestChimp GitHub Action release"
git push origin main
```

### 3. Create a Release

GitHub Actions are distributed via releases. Create a release with a semantic version:

```bash
# Create and push a tag
git tag -a v1.0.0 -m "TestChimp GitHub Action v1.0.0"
git push origin v1.0.0
```

Then create a release on GitHub:
1. Go to your repository on GitHub
2. Click "Releases" → "Create a new release"
3. Select the `v1.0.0` tag
4. Add release title: "TestChimp GitHub Action v1.0.0"
5. Add release notes describing the features
6. Publish the release

### 4. Verify the Action

Test that your action is accessible by trying to use it in a test repository:

```yaml
# .github/workflows/test.yml
name: Test TestChimp Action
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: TestChimp Action
        uses: YOUR_ORG/testchimp-github-action@v1.0.0
        with:
          api-key: ${{ secrets.TESTCHIMP_API_KEY }}
          project-id: ${{ secrets.TESTCHIMP_PROJECT_ID }}
```

## Client Usage

### Setting Up Secrets

Clients need to add the following secrets to their repository:

1. Go to repository Settings → Secrets and variables → Actions
2. Add these repository secrets:
   - `TESTCHIMP_API_KEY`: Their TestChimp project API key
   - `TESTCHIMP_PROJECT_ID`: Their TestChimp project ID

### Basic Usage

Clients can use the action in their workflows like this:

```yaml
name: TestChimp AI Test Repair
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  testchimp:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: TestChimp AI Repair
        uses: YOUR_ORG/testchimp-github-action@v1.0.0
        with:
          api-key: ${{ secrets.TESTCHIMP_API_KEY }}
          project-id: ${{ secrets.TESTCHIMP_PROJECT_ID }}
          test-directory: 'tests'
          success-criteria: 'ORIGINAL_SUCCESS'
```

## Versioning Strategy

- Use semantic versioning (MAJOR.MINOR.PATCH)
- Create a new release for each version
- Tag releases with version numbers (e.g., `v1.0.0`, `v1.1.0`)
- Clients can pin to specific versions or use `@main` for latest

## Updating the Action

When you make updates:

1. Update the version in `package.json`
2. Build and test the changes
3. Commit and push changes
4. Create a new tag and release
5. Update documentation

## Distribution Options

### Option 1: GitHub Marketplace (Recommended)

1. Go to your repository → Actions tab
2. Click "Publish this Action to the GitHub Marketplace"
3. Fill out the marketplace listing form
4. Submit for review (GitHub will review before publishing)

### Option 2: Direct Repository Usage

Clients can use the action directly from your repository:

```yaml
uses: YOUR_ORG/testchimp-github-action@v1.0.0
```

### Option 3: Docker Distribution

You can also distribute as a Docker container, but GitHub Actions are typically distributed as repositories.

## Client Documentation

Provide your clients with:

1. This deployment guide
2. Sample workflow files (see `examples/` directory)
3. Configuration documentation (see `SUCCESS_CRITERIA.md`)
4. Troubleshooting guide

## Security Considerations

- The action is public, so don't include sensitive data in the code
- All authentication is handled via GitHub Secrets
- The action runs in the client's environment with their permissions
- Review and validate all dependencies

## Support

- Provide clear documentation
- Create issue templates for bug reports
- Set up discussions for questions
- Consider providing commercial support options
