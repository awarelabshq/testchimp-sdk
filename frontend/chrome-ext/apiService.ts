// API service for BugsTab and related features
export const BASE_URL = 'https://featureservice-staging.testchimp.io';

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

export interface UpdateBugsRequest {
  updatedBugs: Bug[];
  newStatus?: BugStatus;
  appReleaseId?: string;
}

export interface UpdateBugsResponse { }

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

export async function getScreenForPage(req: GetScreenForPageRequest): Promise<GetScreenForPageResponse> {
  console.log('getScreenForPage called with:', req);
  const headers = await getAuthHeaders();
  console.log('Auth headers:', headers);
  const res = await fetch(`${BASE_URL}/ext/get_screen_for_page`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(req),
  });
  console.log('getScreenForPage response status:', res.status);
  const data = await res.json();
  console.log('getScreenForPage response data:', data);
  return {
    normalizedUrl: data.normalizedUrl,
    screenName: data.screenName,
  };
}

export async function listBugs(req: ListBugsRequest): Promise<ListBugsResponse> {
  const headers = await getAuthHeaders();
  const { environment, releaseId } = await getCurrentEnvironmentAndRelease();
  
  const requestBody = {
    ...req,
    environment: req.environment || environment,
  };
  
  const res = await fetch(`${BASE_URL}/ext/list_bugs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(requestBody),
  });
  const data = await res.json();
  return {
    bugs: data.bugs || [],
  };
}

export async function updateBugs(req: UpdateBugsRequest): Promise<UpdateBugsResponse> {
  const headers = await getAuthHeaders();
  const { environment, releaseId } = await getCurrentEnvironmentAndRelease();
  
  const requestBody = {
    ...req,
    appReleaseId: req.appReleaseId || releaseId,
  };
  
  await fetch(`${BASE_URL}/ext/update_bugs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(requestBody),
  });
  return {};
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
  RequestResponsePair,
  ScreenInfo,
  // Bug-related types
  Bug,
  BugDetail,
  BugStatus,
  BugSeverity,
  JourneyAgnotism,
  BoundingBox,
  ScreenStates,
  // Value/data types
  ConsoleLogItem,
  // ...other imports as needed
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
  // Team details types
  GetTeamDetailsRequest,
  GetTeamDetailsResponse,
  OrgTier,
  OrgPlan,
  UpsertMindMapScreenStateRequest,
  UpsertMindMapScreenStateResponse,
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
 * Captures a screenshot of the current tab's visible viewport and returns the base64 string (no data URL prefix).
 * Uses the background script's 'capture_viewport_screenshot' message handler.
 * Hides the sidebar and toggle button before taking the screenshot to avoid including them in the capture.
 */
export async function captureCurrentTabScreenshotBase64(): Promise<string | undefined> {
  const captureFunction = () => new Promise<string | undefined>((resolve) => {
    chrome.runtime.sendMessage({ type: 'capture_viewport_screenshot' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Screenshot capture error:', chrome.runtime.lastError.message);
        resolve(undefined);
      } else if (response && response.dataUrl) {
        resolve(response.dataUrl);
      } else {
        resolve(undefined);
      }
    });
  });

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

/**
 * Fetches recent console logs from the background script.
 * Returns an array of ConsoleLogItem.
 */
export async function fetchRecentConsoleLogs(): Promise<ConsoleLogItem[]> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: 'get_recent_console_logs' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Console log fetch error:', chrome.runtime.lastError.message);
          resolve([]);
        } else if (response && response.logs) {
          resolve(response.logs);
        } else {
          resolve([]);
        }
      });
    } catch (e) {
      console.error('Console log fetch exception:', e);
      resolve([]);
    }
  });
}

/**
 * Fetches the last N recent request/response pairs from the background script.
 * @param {number} size - Number of pairs to fetch (default 20)
 * @returns {Promise<RequestResponsePair[]>}
 */
export async function fetchRecentRequestResponsePairs(size = 20): Promise<RequestResponsePair[]> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: 'get_recent_request_response_pairs', size }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Request/response pair fetch error:', chrome.runtime.lastError.message);
          resolve([]);
        } else if (response && response.pairs) {
          resolve(response.pairs.slice(0, size));
        } else {
          resolve([]);
        }
      });
    } catch (e) {
      console.error('Request/response pair fetch exception:', e);
      resolve([]);
    }
  });
}

export async function getDomAnalysis(req: GetDomAnalysisRequest): Promise<GetDomAnalysisResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/ext/get_dom_analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(req),
  });
  return await res.json();
}

export async function getConsoleAnalysis(req: GetConsoleAnalysisRequest): Promise<GetConsoleAnalysisResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/ext/get_console_analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(req),
  });
  return await res.json();
}

export async function getScreenshotAnalysis(req: GetScreenshotAnalysisRequest): Promise<GetScreenshotAnalysisResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/ext/get_screenshot_analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(req),
  });
  return await res.json();
}

export async function getNetworkAnalysis(req: GetNetworkAnalysisRequest): Promise<GetNetworkAnalysisResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/ext/get_network_analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(req),
  });
  return await res.json();
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

export interface ListBugsRequest {
  severities?: BugSeverity[];
  screenStates?: ScreenState[];
  statuses?: BugStatus[];
  title?: string;
  environment?: string;
}

export interface ListBugsResponse {
  bugs: BugDetail[];
}

export interface GetDomAnalysisRequest {
  screen?: string;
  state?: string;
  domSnapshot?: string;
  relativeUrl?: string;
}

export interface GetDomAnalysisResponse {
  bugs: BugDetail[];
}

export interface GetConsoleAnalysisRequest {
  screen?: string;
  state?: string;
  relativeUrl?: string;
  logs?: ConsoleLogItem[];
}

export interface GetConsoleAnalysisResponse {
  bugs: BugDetail[];
}

export interface GetScreenshotAnalysisRequest {
  screen?: string;
  state?: string;
  relativeUrl?: string;
  screenshot?: string;
  viewportWidth?: number;
  viewportHeight?: number;
}

export interface GetScreenshotAnalysisResponse {
  bugs: BugDetail[];
}

export interface GetNetworkAnalysisRequest {
  screen?: string;
  state?: string;
  relativeUrl?: string;
  requestResponsePairs?: RequestResponsePair[];
}

export interface GetNetworkAnalysisResponse {
  bugs: BugDetail[];
}

export interface FetchExtraInfoForContextItemRequest {
  id: string;
}
export interface FetchExtraInfoForContextItemResponse {
  extraInfo: Record<string, any>;
}

export interface GrabScreenshotRequest { }
export interface GrabScreenshotResponse {
  screenshotBase64: string;
}

// Get team details
export async function getTeamDetails(req: GetTeamDetailsRequest = {}): Promise<GetTeamDetailsResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/ext/get_team_details`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(req),
  });
  return await res.json();
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

