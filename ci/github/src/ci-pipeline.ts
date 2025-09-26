/**
 * CI Pipeline Abstractions for GitHub Actions
 * 
 * This module provides interfaces and abstractions for CI/CD pipeline integrations.
 * It allows the GitHub Action to work with different CI systems (GitHub, GitLab, etc.)
 * without being tightly coupled to any specific implementation.
 */

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';

export interface GitConfig {
  /** Git user name for commits */
  userName: string;
  /** Git user email for commits */
  userEmail: string;
  /** Default branch name (e.g., 'main', 'master') */
  defaultBranch: string;
}

export interface BranchInfo {
  /** Name of the branch to create */
  name: string;
  /** Base branch to create from */
  baseBranch: string;
  /** Whether the branch already exists */
  exists: boolean;
}

export interface CommitInfo {
  /** Commit message */
  message: string;
  /** List of files to commit */
  files: string[];
  /** Whether to amend the last commit */
  amend?: boolean;
}

export interface PullRequestInfo {
  /** PR title */
  title: string;
  /** PR description/body */
  description: string;
  /** Source branch */
  headBranch: string;
  /** Target branch */
  baseBranch: string;
  /** Labels to apply */
  labels?: string[];
  /** Assignees */
  assignees?: string[];
  /** Reviewers */
  reviewers?: string[];
}

export interface PullRequestResult {
  /** PR number */
  number: number;
  /** PR URL */
  url: string;
  /** Whether PR was created successfully */
  success: boolean;
  /** Error message if creation failed */
  error?: string;
}

export interface TestResults {
  successCount: number;
  failureCount: number;
  totalTests: number;
  repairedFiles: Map<string, string>;
  repairedCount: number;
  repairedAboveThreshold: number;
  repairedBelowThreshold: number;
  successCriteriaUsed: string;
}

/**
 * Abstract interface for Git operations
 * Implementations should handle git commands and repository state
 */
export interface GitOperations {
  /** Initialize git repository if needed */
  initialize(): Promise<void>;
  
  /** Check if we're in a git repository */
  isGitRepository(): Promise<boolean>;
  
  /** Get current branch name */
  getCurrentBranch(): Promise<string>;
  
  /** Check if a branch exists */
  branchExists(branchName: string): Promise<boolean>;
  
  /** Create a new branch */
  createBranch(branchInfo: BranchInfo): Promise<void>;
  
  /** Switch to a branch */
  checkoutBranch(branchName: string): Promise<void>;
  
  /** Add files to staging */
  addFiles(files: string[]): Promise<void>;
  
  /** Commit changes */
  commit(commitInfo: CommitInfo): Promise<void>;
  
  /** Push branch to remote */
  pushBranch(branchName: string, force?: boolean): Promise<void>;
  
  /** Get repository URL */
  getRepositoryUrl(): Promise<string>;
  
  /** Get repository owner and name */
  getRepositoryInfo(): Promise<{ owner: string; repo: string }>;
}

/**
 * Abstract interface for CI Pipeline operations
 * Implementations should handle CI-specific operations like PR creation
 */
export interface CIPipelineOperations {
  /** Create a pull request */
  createPullRequest(prInfo: PullRequestInfo): Promise<PullRequestResult>;
  
  /** Check if we're running in a CI environment */
  isRunningInCI(): boolean;
  
  /** Get CI environment information */
  getCIInfo(): {
    provider: string;
    repository: string;
    branch: string;
    commit: string;
    pullRequest?: number;
  };
  
  /** Get authentication token for API calls */
  getAuthToken(): string | undefined;
}

/**
 * Test success criteria options
 */
export enum SuccessCriteria {
  /** Original test run must be successful */
  ORIGINAL_SUCCESS = 'ORIGINAL_SUCCESS',
  /** If original fails, repair must be successful with confidence >= threshold */
  REPAIR_SUCCESS_WITH_CONFIDENCE = 'REPAIR_SUCCESS_WITH_CONFIDENCE'
}

/**
 * Configuration for CI Pipeline
 */
export interface CIPipelineConfig {
  /** Git configuration */
  git: GitConfig;
  
  /** PR configuration */
  pullRequest: {
    /** Default labels for PRs */
    defaultLabels: string[];
    /** Template for PR titles */
    titleTemplate: string;
    /** Template for PR descriptions */
    descriptionTemplate: string;
    /** Whether to auto-merge PRs */
    autoMerge: boolean;
  };
  
  /** Branch naming configuration */
  branch: {
    /** Template for branch names */
    nameTemplate: string;
    /** Prefix for branch names */
    prefix: string;
  };
  
  /** Test success criteria configuration */
  successCriteria: {
    /** Success criteria to use */
    criteria: SuccessCriteria;
    /** Minimum confidence score for repair success (1-5) */
    repairConfidenceThreshold: number;
  };
}

/**
 * Main CI Pipeline interface that combines Git and CI operations
 */
export interface CIPipeline {
  /** Git operations */
  git: GitOperations;
  
  /** CI operations */
  ci: CIPipelineOperations;
  
  /** Configuration */
  config: CIPipelineConfig;
  
  /** Process repaired files and create PR */
  processRepairedFiles(testResults: TestResults): Promise<PullRequestResult | null>;
}

/**
 * Factory interface for creating CI Pipeline instances
 */
export interface CIPipelineFactory {
  /** Create a CI Pipeline instance */
  createPipeline(config: CIPipelineConfig): CIPipeline;
  
  /** Detect CI environment and create appropriate pipeline */
  detectAndCreatePipeline(): CIPipeline | null;
  
  /** Get supported CI providers */
  getSupportedProviders(): string[];
}
