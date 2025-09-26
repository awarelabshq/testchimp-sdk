/**
 * GitHub-specific CI Pipeline Implementation
 * 
 * This module implements the CI pipeline interfaces for GitHub Actions.
 * It handles Git operations and GitHub API interactions for PR creation.
 */

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';
import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';
import {
  GitOperations,
  CIPipelineOperations,
  CIPipeline,
  CIPipelineConfig,
  BranchInfo,
  CommitInfo,
  PullRequestInfo,
  PullRequestResult,
  TestResults,
  SuccessCriteria
} from './ci-pipeline';

/**
 * GitHub Git Operations Implementation
 */
export class GitHubGitOperations implements GitOperations {
  private config: CIPipelineConfig;

  constructor(config: CIPipelineConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Configure git user
    await exec.exec('git', ['config', 'user.name', this.config.git.userName]);
    await exec.exec('git', ['config', 'user.email', this.config.git.userEmail]);
  }

  async isGitRepository(): Promise<boolean> {
    try {
      await exec.exec('git', ['rev-parse', '--git-dir'], { silent: true });
      return true;
    } catch {
      return false;
    }
  }

  async getCurrentBranch(): Promise<string> {
    const { stdout } = await exec.getExecOutput('git', ['branch', '--show-current']);
    return stdout.trim();
  }

  async branchExists(branchName: string): Promise<boolean> {
    try {
      await exec.exec('git', ['show-ref', '--verify', '--quiet', `refs/heads/${branchName}`], { silent: true });
      return true;
    } catch {
      return false;
    }
  }

  async createBranch(branchInfo: BranchInfo): Promise<void> {
    if (branchInfo.exists) {
      await this.checkoutBranch(branchInfo.name);
    } else {
      await exec.exec('git', ['checkout', '-b', branchInfo.name, branchInfo.baseBranch]);
    }
  }

  async checkoutBranch(branchName: string): Promise<void> {
    await exec.exec('git', ['checkout', branchName]);
  }

  async addFiles(files: string[]): Promise<void> {
    for (const file of files) {
      await exec.exec('git', ['add', file]);
    }
  }

  async commit(commitInfo: CommitInfo): Promise<void> {
    const args = ['commit', '-m', commitInfo.message];
    if (commitInfo.amend) {
      args.push('--amend');
    }
    await exec.exec('git', args);
  }

  async pushBranch(branchName: string, force: boolean = false): Promise<void> {
    const args = ['push', 'origin', branchName];
    if (force) {
      args.push('--force');
    }
    await exec.exec('git', args);
  }

  async getRepositoryUrl(): Promise<string> {
    const { stdout } = await exec.getExecOutput('git', ['config', '--get', 'remote.origin.url']);
    return stdout.trim();
  }

  async getRepositoryInfo(): Promise<{ owner: string; repo: string }> {
    const context = github.context;
    return {
      owner: context.repo.owner,
      repo: context.repo.repo
    };
  }
}

/**
 * GitHub CI Operations Implementation
 */
export class GitHubCIOperations implements CIPipelineOperations {
  private octokit: Octokit;
  private config: CIPipelineConfig;

  constructor(config: CIPipelineConfig, token: string) {
    this.config = config;
    this.octokit = new Octokit({ auth: token });
  }

  async createPullRequest(prInfo: PullRequestInfo): Promise<PullRequestResult> {
    try {
      const { owner, repo } = await this.getRepositoryInfo();
      
      const { data: pr } = await this.octokit.pulls.create({
        owner,
        repo,
        title: prInfo.title,
        head: prInfo.headBranch,
        base: prInfo.baseBranch,
        body: prInfo.description,
        labels: prInfo.labels || this.config.pullRequest.defaultLabels,
        assignees: prInfo.assignees,
        reviewers: prInfo.reviewers
      });

      return {
        number: pr.number,
        url: pr.html_url,
        success: true
      };
    } catch (error) {
      core.error(`Failed to create pull request: ${error}`);
      return {
        number: 0,
        url: '',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  isRunningInCI(): boolean {
    return !!process.env.GITHUB_ACTIONS;
  }

  getCIInfo() {
    const context = github.context;
    return {
      provider: 'github',
      repository: `${context.repo.owner}/${context.repo.repo}`,
      branch: context.ref.replace('refs/heads/', ''),
      commit: context.sha,
      pullRequest: context.payload.pull_request?.number
    };
  }

  getAuthToken(): string | undefined {
    return process.env.GITHUB_TOKEN;
  }

  private async getRepositoryInfo(): Promise<{ owner: string; repo: string }> {
    const context = github.context;
    return {
      owner: context.repo.owner,
      repo: context.repo.repo
    };
  }
}

/**
 * GitHub CI Pipeline Implementation
 */
export class GitHubCIPipeline implements CIPipeline {
  public git: GitOperations;
  public ci: CIPipelineOperations;
  public config: CIPipelineConfig;

  constructor(config: CIPipelineConfig, token: string) {
    this.config = config;
    this.git = new GitHubGitOperations(config);
    this.ci = new GitHubCIOperations(config, token);
  }

  async processRepairedFiles(testResults: TestResults): Promise<PullRequestResult | null> {
    if (testResults.repairedFiles.size === 0) {
      core.info('No files were repaired, skipping PR creation');
      return null;
    }

    try {
      // Initialize git if needed
      await this.git.initialize();

      // Generate branch name
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const branchName = this.config.branch.nameTemplate
        .replace('{timestamp}', timestamp)
        .replace('{prefix}', this.config.branch.prefix);

      // Get current branch as base
      const currentBranch = await this.git.getCurrentBranch();
      
      // Create branch
      const branchExists = await this.git.branchExists(branchName);
      await this.git.createBranch({
        name: branchName,
        baseBranch: currentBranch,
        exists: branchExists
      });

      // Write repaired files
      for (const [filePath, content] of testResults.repairedFiles) {
        const fullPath = path.resolve(filePath);
        const dir = path.dirname(fullPath);
        
        // Ensure directory exists
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        // Write file
        fs.writeFileSync(fullPath, content, 'utf8');
        core.info(`Written repaired file: ${filePath}`);
      }

      // Add and commit files
      const filesToCommit = Array.from(testResults.repairedFiles.keys());
      await this.git.addFiles(filesToCommit);
      
      const commitMessage = this.generateCommitMessage(testResults);
      await this.git.commit({
        message: commitMessage,
        files: filesToCommit
      });

      // Push branch
      await this.git.pushBranch(branchName);

      // Create pull request
      const prInfo = this.generatePullRequestInfo(branchName, currentBranch, testResults);
      const result = await this.ci.createPullRequest(prInfo);

      if (result.success) {
        core.info(`✅ Created pull request #${result.number}: ${result.url}`);
      } else {
        core.error(`❌ Failed to create pull request: ${result.error}`);
      }

      return result;

    } catch (error) {
      core.error(`Failed to process repaired files: ${error}`);
      return {
        number: 0,
        url: '',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private generateCommitMessage(testResults: TestResults): string {
    const repairedCount = testResults.repairedFiles.size;
    const testSummary = `${testResults.successCount}/${testResults.totalTests} tests passed`;
    
    return `🤖 TestChimp AI Repair: Fixed ${repairedCount} test file${repairedCount > 1 ? 's' : ''}\n\n` +
           `Test Results: ${testSummary}\n` +
           `Repaired Files: ${Array.from(testResults.repairedFiles.keys()).join(', ')}`;
  }

  private generatePullRequestInfo(
    headBranch: string, 
    baseBranch: string, 
    testResults: TestResults
  ): PullRequestInfo {
    const repairedCount = testResults.repairedFiles.size;
    const testSummary = `${testResults.successCount}/${testResults.totalTests} tests passed`;
    
    const title = this.config.pullRequest.titleTemplate
      .replace('{count}', repairedCount.toString())
      .replace('{summary}', testSummary);

    const description = this.config.pullRequest.descriptionTemplate
      .replace('{count}', repairedCount.toString())
      .replace('{summary}', testSummary)
      .replace('{files}', Array.from(testResults.repairedFiles.keys()).join('\n- '));

    return {
      title,
      description,
      headBranch,
      baseBranch,
      labels: this.config.pullRequest.defaultLabels
    };
  }
}

/**
 * GitHub CI Pipeline Factory
 */
export class GitHubCIPipelineFactory {
  static createPipeline(config: CIPipelineConfig): CIPipeline {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }
    return new GitHubCIPipeline(config, token);
  }

  static detectAndCreatePipeline(): CIPipeline | null {
    if (!process.env.GITHUB_ACTIONS) {
      return null;
    }

    const config: CIPipelineConfig = {
      git: {
        userName: 'TestChimp Bot',
        userEmail: 'bot@testchimp.io',
        defaultBranch: 'main'
      },
      pullRequest: {
        defaultLabels: ['testchimp', 'ai-repair', 'automated'],
        titleTemplate: '🤖 TestChimp AI Repair: {count} file{count,plural,one{} other{s}} fixed ({summary})',
        descriptionTemplate: `## 🤖 TestChimp AI Repair

This PR contains automated repairs made by TestChimp AI.

### 📊 Test Results
- **Tests Passed**: {summary}
- **Files Repaired**: {count}

### 📁 Repaired Files
- {files}

### 🔧 What was fixed?
TestChimp AI analyzed the failing tests and automatically applied fixes to improve test reliability and correctness.

---
*This PR was created automatically by TestChimp. Please review the changes before merging.*`,
        autoMerge: false
      },
      branch: {
        nameTemplate: '{prefix}/ai-repairs-{timestamp}',
        prefix: 'testchimp'
      },
      successCriteria: {
        criteria: SuccessCriteria.ORIGINAL_SUCCESS,
        repairConfidenceThreshold: 4
      }
    };

    return this.createPipeline(config);
  }

  static getSupportedProviders(): string[] {
    return ['github'];
  }
}

// Export the SuccessCriteria enum for use in index.ts
export { SuccessCriteria };
