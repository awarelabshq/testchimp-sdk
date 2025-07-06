export enum ContextElementType {
    UIElement = 'UIElement',
    BoundingBox = 'BoundingBox',
    // Add more types as needed (e.g., FigmaDesign)
}

export interface UIElementContext {
    id: string;
    type: ContextElementType.UIElement;
    selector?: string;
    role?: string;
    text?: string;
    tagName?: string;
}

// Strongly-typed bounding box value (percentages)
export interface BoundingBoxValue {
    xPct: number; // left as percentage of viewport width
    yPct: number; // top as percentage of viewport height
    wPct: number; // width as percentage of viewport width
    hPct: number; // height as percentage of viewport height
}

export interface BoundingBoxContext {
    id: string;
    type: ContextElementType.BoundingBox;
    value: BoundingBoxValue;
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
    extraInfo: Record<string, string>;
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