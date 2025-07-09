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

export interface InfoContext {
    screenInfo:ScreenInfo;
    contextElements: ContextElement[];
}

export interface ScreenInfo{
    relativeUrl?:string;
    filePaths?:string[];
}

export interface UserInstructionMessage {
    type: 'user_instruction';
    userInstruction: string;
    infoContext?: InfoContext;
    messageId?: string;
}

export interface AckMessage {
    type: 'ack_message';
    messageId: string;
}

// MCP <-> Extension request/response types

// Fetch extra info for context item
export interface FetchExtraInfoForContextItemRequest {
    id: string;
}
export interface FetchExtraInfoForContextItemResponse {
    extraInfo: Record<string, any>;
}

// Grab screenshot
export interface GrabScreenshotRequest {
}

export interface GrabScreenshotResponse {
    screenshotBase64: string;
}

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