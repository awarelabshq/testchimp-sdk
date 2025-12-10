
export enum ContextElementType {
  UIElement = 'UIElement',
  BoundingBox = 'BoundingBox',
  // Add more types as needed (e.g., FigmaDesign)
}

export interface UIElementContext {
  contextId: string;
  type: ContextElementType.UIElement;
  [key: string]: any; // selector, role, text, textContent, tagName, boundingBox, ancestorHierarchy, attributes, computedStyles, etc.
}

// Strongly-typed bounding box value (percentages)
export interface BoundingBoxValue {
  xPct: number; // left as percentage of viewport width
  yPct: number; // top as percentage of viewport height
  wPct: number; // width as percentage of viewport width
  hPct: number; // height as percentage of viewport height
}

export interface BoundingBoxContext {
  contextId: string;
  type: ContextElementType.BoundingBox;
  value: BoundingBoxValue;
  uiElementsInBox?: UIElementContext[];
  [key: string]: any; // allow extra fields
}

export type ContextElement = UIElementContext | BoundingBoxContext;

export interface ScreenInfoContext {
  screenInfo: ScreenInfo;
  contextElements: ContextElement[];
}

export interface ScreenInfo {
  relativeUrl?: string;
  filePaths?: string[];
}

export interface UserInstructionMessage {
  type: 'user_instruction';
  userInstruction: string;
  infoContext?: ScreenInfoContext;
  messageId?: string;
}

export interface AckMessage {
  type: 'ack_message';
  messageId: string;
}

// MCP <-> Extension request/response types

// Console log item structure
export interface ConsoleLogItem {
  level: string; // e.g., 'log', 'warn', 'error', 'info'
  timestamp: number; // ms since epoch
  message: string;
}

// Get recent console logs
export interface GetRecentConsoleLogsRequest {
  /**
   * Log level to filter by (e.g., 'log', 'warn', 'error', 'info').
   * Returns logs at or above the given level (e.g., 'warn' returns 'warn' and 'error').
   * If omitted, all levels are included.
   */
  level?: string;
  /**
   * Maximum number of logs to return (most recent first).
   * If omitted, returns up to the buffer size.
   */
  count?: number;
  /**
   * Only include logs with a timestamp >= sinceTimestamp (ms since epoch).
   * If omitted, no time filter is applied.
   */
  sinceTimestamp?: number;
}
export interface GetRecentConsoleLogsResponse {
  logs: ConsoleLogItem[];
}

export enum BugCategory {
  UNKNOWN_BUG_CATEGORY = "UNKNOWN_BUG_CATEGORY", // Unidentified or unclear bug
  OTHER = "OTHER", // Not fitting any specified category
  ACCESSIBILITY = "ACCESSIBILITY", // Accessibility issues
  SECURITY = "SECURITY", // Security vulnerabilities
  VISUAL = "VISUAL", // Visual issues such as layout concerns, contrast, overlapping elements
  PERFORMANCE = "PERFORMANCE", // Slow load times, unoptimized assets, memory leaks
  FUNCTIONAL = "FUNCTIONAL", // Broken functionality, like input validation errors, form submission issues
  NETWORK = "NETWORK", // API failures, timeout errors, incorrect responses
  USABILITY = "USABILITY", // UI is confusing or difficult to use, poor user feedback
  COMPATIBILITY = "COMPATIBILITY", // Issues across different browsers/devices/resolutions
  DATA_INTEGRITY = "DATA_INTEGRITY", // Corrupt or missing data, incorrect database states
  INTERACTION = "INTERACTION", // Unresponsive UI elements, broken drag/drop, keyboard navigation issues
  LOCALIZATION = "LOCALIZATION", // Language-specific issues, missing translations, incorrect currency formats
  RESPONSIVENESS = "RESPONSIVENESS", // UI issues related to different screen sizes or devices
  LAYOUT = "LAYOUT", // Alignment, spacing, and general layout issues
}

export enum TestPriority {
  UNKNOWN_PRIORITY = 0,
  LOWEST_PRIORITY = 1,
  LOW_PRIORITY = 2,
  MEDIUM_PRIORITY = 3,
  HIGH_PRIORITY = 4,
  HIGHEST_PRIORITY = 5,
}

export enum TestScenarioStatus {
  UNKNOWN_TEST_SCENARIO_STATUS = 0,
  ACTIVE_TEST_SCENARIO = 1,
  DELETED_TEST_SCENARIO = 3,
}

export enum ScenarioTestResult {
  UNKNOWN_TEST_SCENARIO_STATUS = 0,
  UNTESTED = 1,
  TESTED_WORKING = 2,
  TESTED_NOT_WORKING = 3,
  IGNORED_TEST_SCENARIO = 4,
}

export interface AgentCodeUnit {
  semanticCode?: string;
  description?: string;
  agentCode?: string;
  pythonCode?: string;
}

export interface ScenarioTestResultHistoryItem {
  testedBy?: string;
  timestampMillis?: number;
  daysSinceTest?: number;
  result?: ScenarioTestResult;
  releaseId?: string;
  releaseTimestampMillis?: string;
}

export interface TestScenario {
  title?: string;
  expectedBehaviour?: string;
  assertionCode?: string;
  description?: string; // deprecated
  steps?: AgentCodeUnit[];
  priority?: TestPriority;
  id?: string;
}

export interface AgentTestScenarioWithStatus {
  id?: string;
  ordinalId?: number;
  scenario?: TestScenario;
  status?: TestScenarioStatus;
  testCaseId?: string;
  screenName?: string;
  screenState?: string;
  resultHistory?: ScenarioTestResultHistoryItem[];
  creationTimestampMillis?: number;
}

export interface RequestResponsePair {
  url: string;
  method: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  status: number;
  responseTimeMs?: number;
  timestamp: number;
}

// --- Bug Analysis API Types ---

export interface GetDomAnalysisRequest {
  screen?: string;
  state?: string;
  domSnapshot?: string;
  relativeUrl?: string;
}

export interface GetConsoleAnalysisRequest {
  screen?: string;
  state?: string;
  relativeUrl?: string;
  logs?: ConsoleLogItem[];
}

export interface GetScreenshotAnalysisRequest {
  screen?: string;
  state?: string;
  relativeUrl?: string;
  screenshot?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  baseImage?: string;
}

export interface GetNetworkAnalysisRequest {
  screen?: string;
  state?: string;
  relativeUrl?: string;
  requestResponsePairs?: RequestResponsePair[];
}

// --- Bug Data Types (moved from apiService.ts) ---

export interface ScreenStates {
  screen?: string;
  states?: string[];
}

export enum BugSeverity {
  Unknown = 'UNKNOWN_SEVERITY',
  Low = 'LOW_SEVERITY',
  Medium = 'MEDIUM_SEVERITY',
  High = 'HIGH_SEVERITY',
}

export enum JourneyAgnotism {
  UNKNOWN_JOURNEY_AGNOTISM = "UNKNOWN_JOURNEY_AGNOTISM",
  IS_JOURNEY_AGNOSTIC = "IS_JOURNEY_AGNOSTIC",
  NOT_JOURNEY_AGNOSTIC = "NOT_JOURNEY_AGNOSTIC"
}

export interface BoundingBox {
  xPct?: number;
  yPct?: number;
  widthPct?: number;
  heightPct?: number;
}

export enum ViewportNickname {
  UNKNOWN_VIEWPORT_NICKNAME = 0,
  LAPTOP = 1,
  WIDESCREEN = 2,
  MOBILE = 3,
  TABLET = 4,
}

export interface Viewport {
  nickname?: ViewportNickname;
  width?: number;
  height?: number;
}

export interface Bug {
  title?: string;
  description?: string;
  category?: string;
  severity?: BugSeverity;
  evalCommand?: string;
  location?: string;
  screen?: string;
  screenState?: string;
  rule?: string;
  boundingBox?: BoundingBox;
  elementSyntheticId?: string;
  journeyAgnotism?: JourneyAgnotism;
  bugHash?: string;
  scenarioId?: string;
  viewport?: Viewport;
}

export interface BugDetail {
  bug?: Bug;
  sessionLink?: string;
  environment?: string;
  creationTimestampMillis?: number;
  lastUpdatedTimestampMillis?: number;
  status?: BugStatus;
  ordinalId?: number;
  reportedReleaseId?: string;
  assignee?: string;
  ignoreReason?: IgnoreReason;
}

export enum BugStatus {
  UNKNOWN = "UNKNOWN_BUG_STATUS",
  ACTIVE = "ACTIVE",
  IGNORED = "IGNORED",
  FIXED = "FIXED",
}

export enum IgnoreReason {
  UNKNOWN_IGNORE_REASON = "UNKNOWN_IGNORE_REASON",
  INTENDED_BEHAVIOUR = "INTENDED_BEHAVIOUR",
  INACCURATE_ASSESSMENT = "INACCURATE_ASSESSMENT",
  NOT_IMPORTANT = "NOT_IMPORTANT",
}

export enum InfoContextItemType {
  UNKNOWN_INFO_CONTEXT_ITEM_TYPE = 0,
  MINDMAP = 1,
  TEXT_CONTEXT_ITEM = 2,
  FIGMA_DESIGN = 3,
  CONFLUENCE_DOC = 4,
  SCREEN_INFO = 5,
}

export interface ContextData {
  textContent?: string; // For TEXT_CONTEXT_ITEM or SCREEN_INFO (json serialization)
  url?: string;
  confluenceDocumentId?: string;
  figmaContextElement?: any; // TODO: define if needed
}

export interface InfoContextItem {
  id?: string;
  type?: InfoContextItemType;
  title?: string;
  data?: ContextData;
}

export interface InfoContext {
  contextItems: InfoContextItem[];
}

// Interface for bug requests (internal use)
export interface ScreenState {
  name?: string;
  state?: string;
}

export interface SuggestTestScenariosRequest {
  screenState?: ScreenState;
  domSnapshot?: string;
  context?: InfoContext;
  prompt?: string;
}

export interface SuggestTestScenariosResponse {
  suggestedTestScenarios: TestScenarioDetail[];
}

export type TestScenarioDetail = AgentTestScenarioWithStatus;

// --- Team Details API Types ---
export interface GetTeamDetailsRequest { }

export interface GetTeamDetailsResponse {
  tier?: OrgTier;
  plan?: OrgPlan;
}

export enum OrgTier {
  UNKNOWN_ORG_TIER = 0,
  FREE_TIER = 1,
  PRO_TIER = 2,
}

export enum OrgPlan {
  UNKNOWN_PLAN = 0,
  TEAM_PLAN = 1,
  INDIE_PLAN = 2,
}

export interface UpsertMindMapScreenStateRequest {
  screenState?: ScreenState;
  domSnapshot?: string;
  url?: string;
  relatedFilePaths?: string[];
}

export interface UpsertMindMapScreenStateResponse {
  screenState?: ScreenState;
  testScenariosAdded?: number;
  elementGroupsAdded?: number;
  elementsAdded?: number;
}

// Environment management interfaces
export interface ListEnvironmentsRequest {
  // Intentionally kept empty. The list of environments are fetched for the project - using the http header.
}

export interface ListEnvironmentsResponse {
  environments: string[];
}

export interface AddEnvironmentRequest {
  environment?: string;
}

export interface AddEnvironmentResponse {
  // Empty response
}

// --- Jira Integration Types ---

export enum JiraIssueType {
  UNKNOWN_JIRA_TYPE = 0,
  EPIC_JIRA_TYPE = 1,
  STORY_JIRA_TYPE = 2,
  BUG_JIRA_TYPE = 3,
  TASK_JIRA_TYPE = 4,
  SUBTASK_JIRA_TYPE = 5,
  TEST_JIRA_TYPE = 6,
}

export interface JiraIssue {
  issueId: string;
  issueKey: string;
  summary: string;
  description: string;
  issueType: string;
  status: string;
  assignee: string;
  priority: string;
  createdAt: string;
}

export interface FetchJiraIssuesFreetextRequest {
  query?: string;
  issueType?: JiraIssueType;
  includeDescription?: boolean;
  assignee?: string;
}

export interface FetchJiraIssuesFreetextResponse {
  issues: JiraIssue[];
} 