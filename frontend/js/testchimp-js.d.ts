// testchimp-js.d.ts

declare module 'testchimp-js' {
  export interface TestChimpSDKConfig {
    enableRecording?: boolean;
    endpoint?: string;
    projectId: string;
    sessionRecordingApiKey: string;
    samplingProbability?: number;
    maxSessionDurationSecs?: number;
    samplingProbabilityOnError?: number;
    eventWindowToSaveOnError?: number;
    tracedUriRegexListToTrack?: string;
    untracedUriRegexListToTrack?: string;
    excludedUriRegexList?: string[];
    environment?: string;
    enableLogging?: boolean;
    enableOptionsCallTracking?: boolean;
    optimizedImageFiltering?:boolean;
    maxEventSizeBytes?:number;
    pruneLargeEvents?:boolean;
  }

  export interface ReleaseMetadata {
    releaseId: string;
    versionMetaTag?: string;
    etag?: string;
    lastModified?: string;
    detectedTimestamp: string;
  }

  export class TestChimpSDK {
    static startRecording(options: TestChimpSDKConfig): void;
    static endTrackedSession(): void;
    static stopRecording(): void;
    static setCurrentUserId(userId: string): void;
    static getRelatedFiles(): Promise<{ files: Array<{ path: string; type: string; confidenceScore: number }> }>
    static getReleaseMetadata(): Promise<ReleaseMetadata>
  }
}
