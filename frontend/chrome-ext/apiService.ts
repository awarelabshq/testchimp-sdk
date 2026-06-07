// API service for chrome extension features
import { BASE_URL } from './config';

// Remove enums and data interfaces that are not request/response types from this file.
// Only keep request/response interfaces here, and import all data types from datas.ts instead.

export interface GetScreenStatesResponse {
  screenStates?: ScreenStates[];
}


export interface GetScreenForPageRequest {
  url?: string;
}

export interface GetScreenForPageResponse {
  normalizedUrl?: string;
  screenName?: string;
}

// Helper to get auth headers from chrome.storage
export async function getAuthHeaders(): Promise<{ [key: string]: string }> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['userAuthKey', 'currentUserId', 'projectId'], (items) => {
      console.log('Chrome storage items:', items);
      if (items.userAuthKey && items.currentUserId && items.projectId) {
        const headers = {
          'USER_MAIL': items.currentUserId,
          'USER_AUTH_KEY': items.userAuthKey,
          'project-id': items.projectId,
        };
        console.log('Auth headers resolved:', headers);
        resolve(headers);
      } else {
        console.log('No auth headers found in storage');
        resolve({});
      }
    });
  });
}

// Helper to get current environment and release from chrome.storage
export async function getCurrentEnvironmentAndRelease(): Promise<{ environment: string; releaseId?: string }> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['selectedEnvironment', 'selectedRelease'], (items) => {
      resolve({
        environment: items.selectedEnvironment || 'QA',
        releaseId: items.selectedRelease,
      });
    });
  });
}

export async function getScreenStates(): Promise<GetScreenStatesResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/ext/get_screen_states`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  // Return the data as-is since it matches our interface
  return {
    screenStates: data.screen_states || data.screenStates || [],
  };
}

export interface UpsertScreenStatesRequest {
  screenStates?: ScreenStates[];
}

export async function upsertScreenStates(req: UpsertScreenStatesRequest): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/ext/upsert_screen_states`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      screenStates: (req.screenStates || []).map((s) => ({
        screen: s.screen,
        states: s.states || [],
      })),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to upsert screen states');
  }
}

/**
 * Sanitizes a URL to ensure it's safe for JSON serialization.
 * Removes or escapes problematic characters that could break JSON parsing.
 */
function sanitizeUrlForJson(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }
  
  // Remove any control characters (except common whitespace)
  // Control characters can break JSON parsing
  let sanitized = url.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  
  // Ensure the URL is valid UTF-8 and doesn't contain problematic sequences
  // Remove any unpaired surrogates that could cause encoding issues
  try {
    // Test if the string can be properly encoded/decoded
    const encoded = encodeURIComponent(sanitized);
    decodeURIComponent(encoded);
  } catch (e) {
    // If encoding fails, try to fix common issues
    // Remove any invalid UTF-8 sequences
    sanitized = sanitized.replace(/[\uD800-\uDFFF]/g, '');
  }
  
  // Truncate if extremely long (safety measure)
  const MAX_URL_LENGTH = 8192; // Reasonable limit
  if (sanitized.length > MAX_URL_LENGTH) {
    console.warn(`URL truncated from ${sanitized.length} to ${MAX_URL_LENGTH} characters`);
    sanitized = sanitized.substring(0, MAX_URL_LENGTH);
  }
  
  return sanitized;
}

export async function getScreenForPage(req: GetScreenForPageRequest): Promise<GetScreenForPageResponse> {
  console.log('getScreenForPage called with:', req);
  
  // Sanitize the URL to prevent JSON parsing issues
  const sanitizedReq: GetScreenForPageRequest = {
    ...req,
    url: req.url ? sanitizeUrlForJson(req.url) : undefined,
  };
  
  const headers = await getAuthHeaders();
  console.log('Auth headers:', headers);
  const res = await fetch(`${BASE_URL}/ext/get_screen_for_page`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(sanitizedReq),
  });
  console.log('getScreenForPage response status:', res.status);
  const data = await res.json();
  console.log('getScreenForPage response data:', data);
  return {
    normalizedUrl: data.normalizedUrl,
    screenName: data.screenName,
  };
}

export enum ResourceType {
  UNKNOWN_RESOURCE_TYPE = "UNKNOWN_RESOURCE_TYPE",
  ENTRY_RESOURCE = "ENTRY_RESOURCE",
  NON_ENTRY_RESOURCE = "NON_ENTRY_RESOURCE",
  WEBAPP_RESOURCE = "WEBAPP_RESOURCE",
}

export interface ReleaseInfo {
  version?: string;
  firstSeenTimestampMillis?: number;
  lastSeenTimestampMillis?: number;
}

export interface ListReleasesRequest {
  resourceName?: string;
  resourceType?: ResourceType;
  environment?: string;
}

export interface ListReleasesResponse {
  releases: ReleaseInfo[];
}

export async function listReleases(req: ListReleasesRequest): Promise<ListReleasesResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/ext/list_releases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(req),
  });
  const data = await res.json();
  return {
    releases: data.releases || [],
  };
}

export interface CreateNewReleaseRequest {
  resourceName?: string;
  environment?: string;
  resourceType?: ResourceType;
  version?: string;
}

export interface CreateNewReleaseResponse { }

export async function createNewRelease(req: CreateNewReleaseRequest): Promise<CreateNewReleaseResponse> {
  const headers = await getAuthHeaders();
  await fetch(`${BASE_URL}/ext/create_new_release`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(req),
  });
  return {};
}

import {
  TestPriority,
  TestScenarioStatus,
  AgentTestScenarioWithStatus,
  TestScenario,
  ScenarioTestResultHistoryItem,
  AgentCodeUnit,
  ScreenInfo,
  JourneyAgnotism,
  BoundingBox,
  ScreenStates,
  ScenarioTestResult,
  SuggestTestScenariosRequest,
  SuggestTestScenariosResponse,
  TestScenarioDetail,
  // Environment management types
  ListEnvironmentsRequest,
  ListEnvironmentsResponse,
  AddEnvironmentRequest,
  AddEnvironmentResponse,
  ScreenState,
  UpsertMindMapScreenStateRequest,
  UpsertMindMapScreenStateResponse,
  JiraIssueType,
  JiraIssue,
  FetchJiraIssuesFreetextRequest,
  FetchJiraIssuesFreetextResponse,
} from './datas';
import { captureScreenshotWithSidebarHiding } from './screenshotUtils';

export interface ListAgentTestScenariosRequest {
  priorities?: TestPriority[];
  screenStates?: ScreenState[];
  title?: string;
}

export interface ListAgentTestScenariosResponse {
  scenarios: AgentTestScenarioWithStatus[];
}

export async function listAgentTestScenarios(req: ListAgentTestScenariosRequest): Promise<ListAgentTestScenariosResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/ext/list_test_scenarios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(req),
  });
  const data = await res.json();
  return {
    scenarios: data.scenarios || [],
  };
}

export interface UpsertAgentTestScenarioRequest {
  screenName?: string;
  screenState?: string;
  scenario?: TestScenario;
  status?: TestScenarioStatus;
  id?: string;
  testCaseId?: string;
}

export interface UpsertAgentTestScenarioResponse {
  id?: string;
}

export async function upsertAgentTestScenario(req: UpsertAgentTestScenarioRequest): Promise<UpsertAgentTestScenarioResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/ext/upsert_test_scenarios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(req),
  });
  return await res.json();
}

export async function upsertMindMapScreenState(req: UpsertMindMapScreenStateRequest): Promise<UpsertMindMapScreenStateResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/localagent/upsert_mindmap_screen_state`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(req),
  });
  const data = await res.json();
  return {
    screenState: data.screenState,
  };
}

export interface InsertTestScenarioResultRequest {
  testScenarioId?: string;
  result?: ScenarioTestResult;
  environment?: string;
  appReleaseId?:string;
}

export interface InsertTestScenarioResultResponse { }

export interface GithubBranchItem {
  name?: string;
  branchId?: number;
  id?: number;
  isDefault?: boolean;
  creationTimestampMillis?: number;
}

export interface ListGithubBranchesResponse {
  repository?: string;
  defaultBranch?: string;
  branches?: GithubBranchItem[];
  selectedBranchId?: number;
}

export async function listGithubBranches(): Promise<ListGithubBranchesResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/ext/list_github_branches`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({}),
  });
  return await res.json();
}

export interface UploadScreenshotResponse {
  gcpPath?: string;
}

export async function uploadScreenshot(imageBase64: string, stepId: string): Promise<UploadScreenshotResponse> {
  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  // GCP can rate-limit uploads; retry 429s with backoff to avoid failing the whole manual record.
  const maxAttempts = 5;
  const baseBackoffMs = 750;

  const headers = await getAuthHeaders();
  const image = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(`${BASE_URL}/localagent/upload_screenshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        explorationId: 'manual-test',
        journeyExecutionId: 'manual-test',
        stepId,
        image,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        gcpPath: data.gcpPath ?? data.gcp_path,
      };
    }

    const status = res.status;
    let text = '';
    try {
      text = await res.text();
    } catch {
      // ignore
    }

    const shouldRetry = (status === 429 || status === 503) && attempt < maxAttempts - 1;
    if (shouldRetry) {
      const retryAfter = res.headers.get('Retry-After');
      let waitMs: number | undefined;

      if (retryAfter) {
        // Usually `Retry-After` is seconds; sometimes it's already ms.
        const parsed = Number.parseInt(retryAfter, 10);
        if (!Number.isNaN(parsed)) {
          waitMs = retryAfter.includes('ms') ? parsed : parsed * 1000;
        }
      }

      if (!waitMs) {
        waitMs = baseBackoffMs * Math.pow(2, attempt);
      }

      // Add a small jitter so multiple tabs don't synchronize retries.
      const jitterMs = Math.floor(Math.random() * 250);
      await sleep(Math.min(waitMs + jitterMs, 10_000));
      continue;
    }

    lastError = text || `Screenshot upload failed (status ${status})`;
    break;
  }

  throw new Error(
    typeof lastError === 'string' && lastError
      ? lastError
      : 'Screenshot upload failed (max retries reached)'
  );
}

export interface ManualTestStepNotePayload {
  text?: string;
  boundingBox?: { xPct?: number; yPct?: number; widthPct?: number; heightPct?: number };
}

export interface ManualTestStepBugPayload {
  bug?: {
    title?: string;
    description?: string;
    severity?: string;
    category?: string;
    location?: string;
    screen?: string;
    screenState?: string;
    platform?: string;
    artifactReference?: {
      screenshotReference?: {
        boundingBoxes?: { xPct?: number; yPct?: number; widthPct?: number; heightPct?: number }[];
      };
    };
  };
  assignee?: string;
}

export interface ManualTestStepPayload {
  stepId?: string;
  screenshotUrl?: string;
  stepCode?: string;
  notes?: ManualTestStepNotePayload[];
  bugs?: ManualTestStepBugPayload[];
}

export interface InsertManualTestRecordRequest {
  testScenarioId?: string;
  testScenarioIds?: string[];
  executionTitle?: string;
  branchId?: number;
  environment?: string;
  release?: string;
  platform?: string;
  result?: string;
  steps?: ManualTestStepPayload[];
  namedTestRunIds?: string[];
}

export interface NamedTestRunPickerItem {
  id?: string;
  title?: string;
  createdAt?: number | string;
}

export interface ListNamedTestRunsForPickerResponse {
  assignedToMe?: NamedTestRunPickerItem[];
  other?: NamedTestRunPickerItem[];
}

export interface InsertManualTestRecordResponse {
  id?: string;
}

export async function insertManualTestRecord(req: InsertManualTestRecordRequest): Promise<InsertManualTestRecordResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/ext/insert_manual_test_record`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      ...(req.testScenarioId ? { testScenarioId: req.testScenarioId } : {}),
      ...(req.testScenarioIds && req.testScenarioIds.length > 0
        ? { testScenarioIds: req.testScenarioIds }
        : {}),
      ...(req.executionTitle ? { executionTitle: req.executionTitle } : {}),
      branchId: req.branchId,
      environment: req.environment,
      release: req.release,
      platform: req.platform ?? 'WEB_EXECUTION_PLATFORM',
      result: req.result,
      steps: (req.steps || []).map((s) => ({
        ...(s.stepId ? { stepId: s.stepId } : {}),
        stepCode: s.stepCode,
        ...(s.screenshotUrl ? { screenshotUrl: s.screenshotUrl } : {}),
        ...(s.notes && s.notes.length > 0
          ? {
              notes: s.notes.map((n) => ({
                text: n.text,
                ...(n.boundingBox ? { boundingBox: n.boundingBox } : {}),
              })),
            }
          : {}),
        ...(s.bugs && s.bugs.length > 0 ? { bugs: s.bugs } : {}),
      })),
      ...(req.namedTestRunIds && req.namedTestRunIds.length > 0
        ? { namedTestRunIds: req.namedTestRunIds }
        : {}),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to create manual test record');
  }
  return await res.json();
}

export async function listNamedTestRunsForPicker(): Promise<ListNamedTestRunsForPickerResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/named-test-run/list-for-picker`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to list test runs');
  }
  return await res.json();
}

export async function insertTestScenarioResult(req: InsertTestScenarioResultRequest): Promise<InsertTestScenarioResultResponse> {
  const headers = await getAuthHeaders();
  const { environment, releaseId } = await getCurrentEnvironmentAndRelease();
  
  const requestBody = {
    ...req,
    environment: req.environment || environment,
    appReleaseId: req.appReleaseId || releaseId,
  };
  
  await fetch(`${BASE_URL}/ext/insert_test_scenario_result`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(requestBody),
  });
  return {};
}

export interface SuggestTestScenarioDescriptionRequest {
  screenState?: ScreenState;
  scenarioTitle?: string;
}

export interface SuggestTestScenarioDescriptionResponse {
  steps: AgentCodeUnit[];
  expectedBehaviour?: string;
}

export async function suggestTestScenarioDescription(req: SuggestTestScenarioDescriptionRequest): Promise<SuggestTestScenarioDescriptionResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/ext/suggest_test_scenario_description`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(req),
  });
  const data = await res.json();
  return data;
}

/**
 * Captures a screenshot of the current tab's visible viewport (JPEG data URL).
 * Uses background service worker port capture; hides sidebar and toggle before capture.
 */
export async function captureCurrentTabScreenshotBase64(): Promise<string | undefined> {
  const { captureScreenshotWithSidebarHiding, captureViewportViaPort } = await import('./screenshotUtils');
  const captureFunction = () => captureViewportViaPort();

  return captureScreenshotWithSidebarHiding(
    captureFunction,
    () => window.postMessage({ type: 'tc-hide-sidebar' }, '*'),
    () => window.postMessage({ type: 'tc-show-sidebar' }, '*'),
    () => {
      const toggleButton = document.getElementById('testchimp-sidebar-toggle');
      if (toggleButton) {
        toggleButton.style.display = 'none';
      }
    },
    () => {
      const toggleButton = document.getElementById('testchimp-sidebar-toggle');
      if (toggleButton) {
        toggleButton.style.display = 'block';
      }
    }
  );
}

export async function suggestTestScenarios(request: SuggestTestScenariosRequest): Promise<SuggestTestScenariosResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/ext/suggest_test_scenarios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error('Failed to suggest test scenarios');
  return response.json();
}

// --- API Request/Response Interfaces ---

export interface FetchExtraInfoForContextItemRequest {
  id: string;
}
export interface FetchExtraInfoForContextItemResponse {
  extraInfo: Record<string, any>;
}

export interface ListPossibleAssigneesRequest {
}

export interface SimpleUserInfo {
  email?: string;
  name?: string;
  userId?: string;
}

export interface ListPossibleAssigneesResponse {
  users: SimpleUserInfo[];
}

export interface GrabScreenshotRequest { }
export interface GrabScreenshotResponse {
  screenshotBase64: string;
}

// Environment management functions
export async function listEnvironments(req: ListEnvironmentsRequest = {}): Promise<ListEnvironmentsResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/ext/list_environments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(req),
  });
  return await res.json();

}

export async function addEnvironment(req: AddEnvironmentRequest): Promise<AddEnvironmentResponse> {
  const headers = await getAuthHeaders();
  await fetch(`${BASE_URL}/ext/add_environment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(req),
  });
  return {};
}

export enum MindMapStatus {
  UNKNOWN_MINDMAP_STATUS = 0,
  MINDMAP_NOT_BUILT = 1,
  MINDMAP_BUILD_IN_PROGRESS = 2,
  MINDMAP_BUILD_COMPLETED = 3,
}

export interface GetMindMapStatusResponse {
  status?: MindMapStatus;
}

export async function getMindMapStatus(): Promise<GetMindMapStatusResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/ext/get_mindmap_status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  return {
    status: typeof data.status === 'number' ? data.status : MindMapStatus.UNKNOWN_MINDMAP_STATUS,
  };
}

/**
 * Fetch Jira issues using free-text search.
 */
export async function fetchJiraIssuesFreetext(req: FetchJiraIssuesFreetextRequest): Promise<FetchJiraIssuesFreetextResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/ext/fetch_jira_issues`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(req),
  });
  return await res.json();
}

/**
 * List possible assignees for manual test bugs and other items.
 */
export async function listPossibleAssignees(req: ListPossibleAssigneesRequest = {}): Promise<ListPossibleAssigneesResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/explore/list_possible_assignees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(req),
  });
  const data = await res.json();
  return {
    users: data.users || [],
  };
}

// Screenshot management functions
import { Viewport, ViewportNickname } from './datas';

export interface Screenshot {
  url?: string;
  viewport?: Viewport;
}

export interface ListScreenshotsRequest {
  screen?: string;
  state?: string;
  environment?: string;
}

export interface ListScreenshotsResponse {
  screenshots: Screenshot[];
}

/**
 * List screenshots for a given screen, state, and environment.
 */
export async function listScreenshots(req: ListScreenshotsRequest = {}): Promise<ListScreenshotsResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/localagent/list_screenshots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(req),
  });
  const data = await res.json();
  return {
    screenshots: data.screenshots || [],
  };
}

// Smart Test Generation
export interface CapturedStep {
  id: string;
  command: string;
  kind: string;
  timestampMillis: number;  // Relative timestamp in milliseconds since capture start
  domContext?: string;
  pageUrl?: string;
  pageTitle?: string;
  element?: {
    tag: string;
    attributes: Record<string, string>;
    text?: string;
  };
}

export interface GenerateSmartTestRequest {
  testName: string;
  capturedSteps: CapturedStep[];  // Rich steps with context for LLM processing
  projectId?: string;
  // When true, backend/LLM will try to match existing code structure
  // by reusing POM files and ENV_FILE variables where possible.
  enableReuse?: boolean;
  /** Optional scenario id to link the generated test to (e.g. from test planning "Record via extension") */
  scenarioId?: string;
}

export interface GenerateSmartTestResponse {
  testId: string;
}

export async function generateSmartTest(req: GenerateSmartTestRequest): Promise<GenerateSmartTestResponse> {
  console.log('[API] GenerateSmartTest request:', req);
  console.log('[API] Captured steps count:', req.capturedSteps?.length || 0);
  if (req.scenarioId) {
    console.log('[API] GenerateSmartTest scenarioId (linking to scenario):', req.scenarioId);
  }
  const body: Record<string, unknown> = {
    testName: req.testName,
    capturedSteps: req.capturedSteps,
    ...(req.projectId != null && { projectId: req.projectId }),
    ...(req.enableReuse != null && { enableReuse: req.enableReuse }),
    ...(req.scenarioId != null && req.scenarioId !== '' && { scenario_id: req.scenarioId }),
  };
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/ext/generate_smart_test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Failed to generate smart test: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return {
    testId: data.testId || '',
  };
}

