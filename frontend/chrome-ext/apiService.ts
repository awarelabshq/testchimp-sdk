// API service for BugsTab and related features
export const BASE_URL = 'https://featureservice-staging.testchimp.io';

// Interfaces matching server-side definition
export interface ScreenStates {
  screen?: string;
  states?: string[];
}

export interface GetScreenStatesResponse {
  screenStates?: ScreenStates[];
}

// Interface for bug requests (internal use)
export interface ScreenState {
  name?: string;
  state?: string;
}

export interface GetScreenForPageRequest {
  url?: string;
}

export interface GetScreenForPageResponse {
  normalizedUrl?: string;
  screenName?: string;
}

export enum BugSeverity {
  Unknown = 'UNKNOWN_SEVERITY',
  Low = 'LOW_SEVERITY',
  Medium = 'MEDIUM_SEVERITY',
  High = 'HIGH_SEVERITY',
}

export interface ListBugsRequest {
  severities?: BugSeverity[];
  screenStates?: ScreenState[];
  statuses?: BugStatus[];
  title?: string;
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
}

export interface ListBugsResponse {
  bugs: BugDetail[];
}

export enum BugStatus {
  UNKNOWN = "UNKNOWN_BUG_STATUS",
  ACTIVE = "ACTIVE",
  IGNORED = "IGNORED",
  FIXED = "FIXED",
}

export interface UpdateBugsRequest {
  updatedBugs: Bug[];
  newStatus?: BugStatus;
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
  const res = await fetch(`${BASE_URL}/ext/list_bugs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(req),
  });
  const data = await res.json();
  return {
    bugs: data.bugs || [],
  };
}

export async function updateBugs(req: UpdateBugsRequest): Promise<UpdateBugsResponse> {
  const headers = await getAuthHeaders();
  await fetch(`${BASE_URL}/ext/update_bugs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(req),
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
  ScenarioTestResult,
  AgentTestScenarioWithStatus,
  TestScenario,
  ScenarioTestResultHistoryItem,
  AgentCodeUnit,
} from './datas';

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

export interface InsertTestScenarioResultRequest {
  testScenarioId?: string;
  result?: ScenarioTestResult;
  environment?: string;
}

export interface InsertTestScenarioResultResponse {}

export async function insertTestScenarioResult(req: InsertTestScenarioResultRequest): Promise<InsertTestScenarioResultResponse> {
  const headers = await getAuthHeaders();
  await fetch(`${BASE_URL}/ext/insert_test_scenario_result`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(req),
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