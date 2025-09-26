import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as glob from '@actions/glob';
import { TestChimpService, CIFileHandler, createProjectApiKeyAuth, createAuthConfigFromEnv } from 'testchimp-runner-core';
import { GitHubCIPipelineFactory, SuccessCriteria } from './github-pipeline';

function getBackendUrl(): string {
  // Check if we're in staging environment by looking for staging indicators
  const isStaging = process.env.NODE_ENV === 'staging' || 
                   process.env.TESTCHIMP_ENV === 'staging' ||
                   process.env.GITHUB_REF?.includes('staging') ||
                   process.env.GITHUB_HEAD_REF?.includes('staging');
  
  if (isStaging) {
    return 'https://featureservice-staging.testchimp.io';
  }
  
  // Default to production
  return 'https://featureservice.testchimp.io';
}

async function run(): Promise<void> {
  try {
    // Get inputs
    const testDirectory = core.getInput('test-directory') || 'tests';
    const recursive = core.getInput('recursive') === 'true';
    const includePattern = core.getInput('include-pattern') || '**/*.spec.{js,ts}';
    const excludePattern = core.getInput('exclude-pattern') || '**/node_modules/**';
    const mode = core.getInput('mode') || 'RUN_WITH_AI_REPAIR';
    const deflakeRuns = parseInt(core.getInput('deflake-runs') || '3');
    const headless = core.getInput('headless') === 'true';
    const successCriteria = core.getInput('success-criteria') as SuccessCriteria || SuccessCriteria.ORIGINAL_SUCCESS;
    const repairConfidenceThreshold = parseInt(core.getInput('repair-confidence-threshold') || '4');

    core.info(`TestChimp: Scanning directory ${testDirectory} for TestChimp managed tests...`);

    // Set up authentication configuration
    let authConfig = createAuthConfigFromEnv();
    
    // If no auth config from environment, use required project API key from GitHub secrets
    if (!authConfig) {
      const apiKey = core.getInput('api-key');
      const projectId = core.getInput('project-id');
      
      if (!apiKey || !projectId) {
        core.setFailed('TestChimp: Both api-key and project-id are required for CI authentication');
        return;
      }
      
      authConfig = createProjectApiKeyAuth(apiKey, projectId);
      core.info('TestChimp: Using project API key authentication');
    } else {
      core.info(`TestChimp: Using authentication from environment variables (${authConfig.mode})`);
    }

    // Determine backend URL based on environment
    const backendUrl = getBackendUrl();
    core.info(`TestChimp: Using backend URL: ${backendUrl}`);

    // Initialize TestChimp service with CI file handler (creates PRs instead of direct writes)
    // Use the test directory as the base path for relative path resolution
    const ciFileHandler = new CIFileHandler('./testchimp-artifacts', testDirectory);
    const testChimpService = new TestChimpService(ciFileHandler, authConfig || undefined, backendUrl);
    await testChimpService.initialize();

    // Find TestChimp managed tests
    const testFiles = testChimpService.findTestChimpTests(testDirectory, recursive);
    
    core.info(`TestChimp: Found ${testFiles.length} TestChimp managed tests`);

    if (testFiles.length === 0) {
      core.info('TestChimp: No TestChimp managed tests found. Skipping execution.');
      core.setOutput('status', 'skipped');
      core.setOutput('test-count', '0');
      core.setOutput('success-count', '0');
      core.setOutput('failure-count', '0');
      return;
    }

    // Execute tests
    let successCount = 0;
    let failureCount = 0;
    let repairedCount = 0;
    let repairedAboveThreshold = 0;
    let repairedBelowThreshold = 0;

    core.info(`TestChimp: Using success criteria: ${successCriteria}`);
    if (successCriteria === SuccessCriteria.REPAIR_SUCCESS_WITH_CONFIDENCE) {
      core.info(`TestChimp: Repair confidence threshold: ${repairConfidenceThreshold}`);
    }

    for (const testFile of testFiles) {
      core.info(`TestChimp: Executing ${testFile}...`);
      
      try {
        // Convert absolute path to relative path for the file handler
        const path = require('path');
        const relativeTestFile = path.relative(testDirectory, testFile);
        
        const request = {
          scriptFilePath: relativeTestFile,
          mode: mode,
          headless: headless,
          deflake_run_count: deflakeRuns
        };

        const result = await testChimpService.executeScript(request);
        
        // Determine if this test should be considered successful based on criteria
        let isSuccessful = false;
        
        if (result.run_status === 'success') {
          // Original test passed
          isSuccessful = true;
          core.info(`TestChimp: ✅ ${testFile} - SUCCESS (original)`);
        } else if (successCriteria === SuccessCriteria.REPAIR_SUCCESS_WITH_CONFIDENCE && 
                   result.repair_status === 'success' && 
                   (result.repair_confidence || 0) >= repairConfidenceThreshold) {
          // Original failed but repair succeeded with sufficient confidence
          isSuccessful = true;
          repairedCount++;
          repairedAboveThreshold++;
          core.info(`TestChimp: ✅ ${testFile} - SUCCESS (repaired with confidence ${result.repair_confidence})`);
        } else if (result.repair_status === 'success' || result.repair_status === 'partial') {
          // Repair was attempted but doesn't meet success criteria
          repairedCount++;
          if ((result.repair_confidence || 0) >= repairConfidenceThreshold) {
            repairedAboveThreshold++;
          } else {
            repairedBelowThreshold++;
          }
          core.error(`TestChimp: ❌ ${testFile} - REPAIR FAILED: confidence ${result.repair_confidence} < threshold ${repairConfidenceThreshold}`);
        } else {
          // No repair or repair failed
          core.error(`TestChimp: ❌ ${testFile} - FAILED: ${result.error || 'No repair available'}`);
        }
        
        if (isSuccessful) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        core.error(`TestChimp: ❌ ${testFile} - ERROR: ${error}`);
        failureCount++;
      }
    }

    // Set outputs
    core.setOutput('status', failureCount === 0 ? 'success' : 'failed');
    core.setOutput('test-count', testFiles.length.toString());
    core.setOutput('success-count', successCount.toString());
    core.setOutput('failure-count', failureCount.toString());
    core.setOutput('repaired-count', repairedCount.toString());
    core.setOutput('repaired-above-threshold', repairedAboveThreshold.toString());
    core.setOutput('repaired-below-threshold', repairedBelowThreshold.toString());
    core.setOutput('success-criteria-used', successCriteria);

    // Summary
    core.info(`TestChimp: Execution complete - ${successCount}/${testFiles.length} tests passed`);
    if (repairedCount > 0) {
      core.info(`TestChimp: ${repairedCount} tests were repaired: ${repairedAboveThreshold} above threshold (≥${repairConfidenceThreshold}), ${repairedBelowThreshold} below threshold (<${repairConfidenceThreshold})`);
    }

    // Check if any files were repaired and create PR if needed
    const repairedFiles = ciFileHandler.getRepairedFiles();
    if (repairedFiles.size > 0) {
      core.info(`TestChimp: ${repairedFiles.size} files were repaired. Creating PR...`);
      
      try {
        // Create CI pipeline for PR creation
        const ciPipeline = GitHubCIPipelineFactory.detectAndCreatePipeline();
        if (!ciPipeline) {
          core.warning('TestChimp: Not running in GitHub Actions environment. Skipping PR creation.');
          return;
        }

        // Process repaired files and create PR
        const testResults = {
          successCount,
          failureCount,
          totalTests: testFiles.length,
          repairedFiles,
          repairedCount,
          repairedAboveThreshold,
          repairedBelowThreshold,
          successCriteriaUsed: successCriteria
        };

        const prResult = await ciPipeline.processRepairedFiles(testResults);
        
        if (prResult?.success) {
          core.setOutput('pull-request-number', prResult.number.toString());
          core.setOutput('pull-request-url', prResult.url);
          core.info(`TestChimp: ✅ Successfully created PR #${prResult.number}`);
        } else {
          core.error(`TestChimp: ❌ Failed to create PR: ${prResult?.error || 'Unknown error'}`);
        }
      } catch (error) {
        core.error(`TestChimp: ❌ Error creating PR: ${error}`);
      }
    } else {
      core.info('TestChimp: No files were repaired, skipping PR creation');
    }

    if (failureCount > 0) {
      core.setFailed(`${failureCount} tests failed`);
    }

  } catch (error) {
    core.setFailed(`TestChimp: Action failed - ${error}`);
  }
}

// Run the action
run();
