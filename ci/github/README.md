# TestChimp GitHub Action

🤖 AI-powered test repair for GitHub Actions - automatically fix failing tests with intelligent repair suggestions.

## Features

- **AI-Powered Test Repair**: Automatically repairs failing tests using advanced AI
- **Configurable Success Criteria**: Choose between original success only or repair success with confidence thresholds
- **Pull Request Integration**: Automatically creates PRs with repaired test files
- **Comprehensive Reporting**: Detailed metrics on test execution and repair success rates
- **CI/CD Integration**: Seamlessly integrates with existing GitHub workflows

## Quick Start

### 1. Set up GitHub Secrets

Add these secrets to your repository:

1. Go to your repository → Settings → Secrets and variables → Actions
2. Add these repository secrets:
   - `TESTCHIMP_API_KEY`: Your TestChimp project API key
   - `TESTCHIMP_PROJECT_ID`: Your TestChimp project ID

### 2. Add the Action to Your Workflow

Create `.github/workflows/testchimp.yml`:

```yaml
name: TestChimp AI Test Repair
on: [push, pull_request]
jobs:
  testchimp:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: TestChimp AI Repair
        uses: awarelabshq/testchimp-github-testrunner@v1.0.0
        with:
          api-key: ${{ secrets.TESTCHIMP_API_KEY }}
          project-id: ${{ secrets.TESTCHIMP_PROJECT_ID }}
```

### 3. Run Your Tests

Push your code or create a pull request - TestChimp will automatically:
- Scan for TestChimp-managed tests
- Execute tests with AI repair capabilities
- Create pull requests with repaired files (if any repairs are made)
- Provide detailed reporting on test results

## Configuration Options

### Required Parameters

| Parameter | Description |
|-----------|-------------|
| `api-key` | TestChimp project API key |
| `project-id` | TestChimp project ID |

### Optional Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `test-directory` | `tests` | Directory to scan for tests |
| `success-criteria` | `ORIGINAL_SUCCESS` | Success criteria (`ORIGINAL_SUCCESS` or `REPAIR_SUCCESS_WITH_CONFIDENCE`) |
| `repair-confidence-threshold` | `4` | Minimum confidence score (1-5) for repair success |
| `mode` | `RUN_WITH_AI_REPAIR` | Execution mode |
| `headless` | `true` | Run browser in headless mode |
| `deflake-runs` | `2` | Number of deflake runs to attempt |

## Success Criteria

### ORIGINAL_SUCCESS (Default)
Only tests that pass on their original run are considered successful. AI repairs don't count as success.

```yaml
success-criteria: 'ORIGINAL_SUCCESS'
```

### REPAIR_SUCCESS_WITH_CONFIDENCE
Tests that either pass originally OR are successfully repaired with sufficient confidence.

```yaml
success-criteria: 'REPAIR_SUCCESS_WITH_CONFIDENCE'
repair-confidence-threshold: '4'  # 1-5 scale
```

## Output Parameters

The action provides these outputs:

| Parameter | Description |
|-----------|-------------|
| `status` | Overall execution status (success/failed) |
| `test-count` | Number of tests executed |
| `success-count` | Number of successful tests |
| `failure-count` | Number of failed tests |
| `repaired-count` | Number of tests that were repaired |
| `repaired-above-threshold` | Number of tests repaired with confidence above threshold |
| `repaired-below-threshold` | Number of tests repaired with confidence below threshold |
| `success-criteria-used` | Success criteria that was applied |
| `pull-request-number` | Number of created PR (if any) |
| `pull-request-url` | URL of created PR (if any) |

## Example Workflows

### Basic Usage
```yaml
- name: TestChimp AI Repair
        uses: awarelabshq/testchimp-github-testrunner@v1.0.0
  with:
    api-key: ${{ secrets.TESTCHIMP_API_KEY }}
    project-id: ${{ secrets.TESTCHIMP_PROJECT_ID }}
```

### With Custom Configuration
```yaml
- name: TestChimp AI Repair
        uses: awarelabshq/testchimp-github-testrunner@v1.0.0
  with:
    api-key: ${{ secrets.TESTCHIMP_API_KEY }}
    project-id: ${{ secrets.TESTCHIMP_PROJECT_ID }}
    test-directory: 'e2e-tests'
    success-criteria: 'REPAIR_SUCCESS_WITH_CONFIDENCE'
    repair-confidence-threshold: '3'
    headless: 'false'
```

### Using Outputs
```yaml
- name: TestChimp AI Repair
  id: testchimp
        uses: awarelabshq/testchimp-github-testrunner@v1.0.0
  with:
    api-key: ${{ secrets.TESTCHIMP_API_KEY }}
    project-id: ${{ secrets.TESTCHIMP_PROJECT_ID }}

- name: Display Results
  run: |
    echo "Tests executed: ${{ steps.testchimp.outputs.test-count }}"
    echo "Tests passed: ${{ steps.testchimp.outputs.success-count }}"
    echo "Tests repaired: ${{ steps.testchimp.outputs.repaired-count }}"
```

## Examples

Check the `examples/` directory for:
- `basic-usage.yml` - Simple workflow setup
- `advanced-usage.yml` - Different success criteria configurations
- `ci-integration.yml` - Integration with existing CI/CD pipelines

## Troubleshooting

### Common Issues

1. **Authentication errors**: Ensure `TESTCHIMP_API_KEY` and `TESTCHIMP_PROJECT_ID` secrets are set correctly
2. **No tests found**: Check that your test directory contains TestChimp-managed tests
3. **Repairs not accepted**: Verify your confidence threshold isn't too high

### Debug Information

The action provides detailed logging:
- Success criteria being used
- Confidence threshold for repairs
- Individual test results with confidence scores
- Summary statistics including repair counts

## Support

- 📖 [Full Documentation](SUCCESS_CRITERIA.md)
- 🐛 [Report Issues](https://github.com/testchimp/testchimp-github-action/issues)
- 💬 [Ask Questions](https://github.com/testchimp/testchimp-github-action/discussions)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.