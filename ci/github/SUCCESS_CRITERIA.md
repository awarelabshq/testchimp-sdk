# TestChimp CI Action - Success Criteria Configuration

The TestChimp CI Action now supports configurable test success criteria, allowing you to define what constitutes a successful test run based on your specific requirements.

## Available Success Criteria

### 1. ORIGINAL_SUCCESS (Default)
- **Description**: Only tests that pass on their original run are considered successful
- **Behavior**: If a test fails and is repaired by AI, it's still considered a failure
- **Use Case**: When you want to ensure all tests pass without any AI intervention

### 2. REPAIR_SUCCESS_WITH_CONFIDENCE
- **Description**: Tests that either pass originally OR are successfully repaired with sufficient confidence
- **Behavior**: 
  - Original test success = success
  - Original test failure + successful repair with confidence ≥ threshold = success
  - Original test failure + repair with confidence < threshold = failure
- **Use Case**: When you trust AI repairs above a certain confidence level

## Configuration Parameters

### Required Authentication

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api-key` | string | ✅ Yes | TestChimp project API key |
| `project-id` | string | ✅ Yes | TestChimp project ID |

### Input Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `success-criteria` | string | `ORIGINAL_SUCCESS` | Success criteria to use |
| `repair-confidence-threshold` | integer | `4` | Minimum confidence score (1-5) for repair success |

### Output Parameters

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

## Usage Examples

### Example 1: Original Success Only
```yaml
- name: TestChimp with Original Success
  uses: ./testchimp-action
  with:
    api-key: ${{ secrets.TESTCHIMP_API_KEY }}
    project-id: ${{ secrets.TESTCHIMP_PROJECT_ID }}
    success-criteria: 'ORIGINAL_SUCCESS'
```

### Example 2: Allow Repairs with High Confidence
```yaml
- name: TestChimp with Repair Success
  uses: ./testchimp-action
  with:
    api-key: ${{ secrets.TESTCHIMP_API_KEY }}
    project-id: ${{ secrets.TESTCHIMP_PROJECT_ID }}
    success-criteria: 'REPAIR_SUCCESS_WITH_CONFIDENCE'
    repair-confidence-threshold: '4'
```

### Example 3: Allow Repairs with Lower Confidence
```yaml
- name: TestChimp with Lower Confidence Threshold
  uses: ./testchimp-action
  with:
    api-key: ${{ secrets.TESTCHIMP_API_KEY }}
    project-id: ${{ secrets.TESTCHIMP_PROJECT_ID }}
    success-criteria: 'REPAIR_SUCCESS_WITH_CONFIDENCE'
    repair-confidence-threshold: '3'
```

## Confidence Score Scale

The repair confidence score ranges from 0-5:

- **5**: Very high confidence - repairs are solid and maintainable
- **4**: High confidence - repairs are likely reliable (default threshold)
- **3**: Medium confidence - repairs may be acceptable for some use cases
- **2**: Low confidence - repairs are questionable
- **1**: Very low confidence - repairs are unreliable
- **0**: No confidence - repairs failed

## Decision Matrix

| Original Result | Repair Result | Confidence | ORIGINAL_SUCCESS | REPAIR_SUCCESS_WITH_CONFIDENCE (≥4) |
|----------------|---------------|------------|------------------|--------------------------------------|
| ✅ Success | N/A | N/A | ✅ Success | ✅ Success |
| ❌ Failed | ❌ Failed | N/A | ❌ Failed | ❌ Failed |
| ❌ Failed | ✅ Success | ≥ 4 | ❌ Failed | ✅ Success |
| ❌ Failed | ✅ Success | < 4 | ❌ Failed | ❌ Failed |
| ❌ Failed | ⚠️ Partial | ≥ 4 | ❌ Failed | ❌ Failed |
| ❌ Failed | ⚠️ Partial | < 4 | ❌ Failed | ❌ Failed |

## Best Practices

1. **Start with ORIGINAL_SUCCESS** for critical test suites where you want to ensure all tests pass without AI intervention
2. **Use REPAIR_SUCCESS_WITH_CONFIDENCE** for development environments or when you trust AI repairs
3. **Set confidence threshold to 4 or 5** for production environments
4. **Monitor repair confidence scores** to understand the reliability of AI repairs over time
5. **Use the output parameters** to track repair statistics and make informed decisions about threshold adjustments

## Migration Guide

If you're upgrading from a previous version:

1. **No changes required** - the default behavior remains `ORIGINAL_SUCCESS`
2. **To enable repair-based success**, add the new parameters to your workflow
3. **Test with lower confidence thresholds** initially to understand the repair quality
4. **Gradually increase the threshold** as you gain confidence in the AI repairs

## Troubleshooting

### Common Issues

1. **All tests failing despite repairs**: Check if you're using `ORIGINAL_SUCCESS` criteria
2. **Repairs not being accepted**: Verify the confidence threshold isn't too high
3. **Inconsistent results**: Review the repair confidence scores in the output

### Debug Information

The action provides detailed logging:
- Success criteria being used
- Confidence threshold for repairs
- Individual test results with confidence scores
- Summary statistics including average repair confidence
