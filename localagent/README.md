# TestChimp Local Agent - Agentic Testing, from your CLI 

## Introduction

TestChimp is an AI QA platform, that does autonomous agentic explorations of webapps to:
- Build a comprehensive mindmap about the webapps' behaviour (Capturing different screens, states, pathways, down to individual elements in screens)
- Captures critical bugs across visual, security, functional, UX, usability, accessibility and many more categories by analyzing DOM, Screenshots, Network and Console logs.
- Auto-generate test scenarios for the webapp
- Write test scripts for the identified test scenarios
- Provide visual feedback for screens in your webapp

The mindmap built by TestChimp is then made available as contextual knowledge for various QA workflows such as:
- Scoping out detailed user stories
- Brainstorming test scenarios to consider
- Writing precise and detailed test steps for test scenarios
- and more...

You can sign up for free at: https://testchimp.io

## TestChimp-Local

By default, the agent runs on TestChimps' servers. testchimp-local enables you to run TestChimp's autonomous testing agent locally. This enables the following:

- Test your localhost version (during development phase, before pushing to staging envs)
- Reuse your signed in sessions for testing sites with complex sign-in processes (eg: SSO, 2FA etc.)
- When your site under test is not open to public internet access (due to firewalls etc.)
- For human-in-the-loop hybrid exploration with the agent. 

## Prerequisites

Python 3.11 or above should be installed.

## How to Run

1. Install:

```
pip install --upgrade testchimp-local
```

2. Create an exploration configuration file

Refer Configuration section below for guide and examples.

Here is a minimal config file to get started:

```
{
  "browserContext": {
    "mode": "launch",
  },
  "explorationConfig": {
    "promptConfig": {
      "url": "https://example.com",
      "explorePrompt": "Explore the website and find any issues",
      "testDataPrompt": "Login with test@example.com password1"
    },
    "maxCredits": 50,
    "maxJourneys": 2,
    "bugCaptureSettings": {
      "sources": ["dom", "screenshot", "network", "console"]
    },
    "viewportConfig": {
      "viewports": [
        {
          "nickname": "laptop"
        }
      ]
    },
    "urlRegexToCapture": ".*\\.example\\.com.*"
  },
  "appReleaseLabel": "local_default"
}
```

3. Set environment variables

Following environment variables are used for authenticating your local agent client and syncing with TestChimp platform:

- TESTCHIMP_PAT: Sign in to your TestChimp account. Go to user settings (click on your name at side bar bottom). Copy Personal Access Token value.
- TESTCHIMP_PROJECT_ID: The project id for which the results will be synced. Go to project settings -> General. Copy project id.
- TESTCHIMP_EMAIL: Email address used for signing-up with TestChimp

3. Run

Create a exploration config json file (refer below Configuration section).

```
./testchimp-local --config_file=<path to your exploration_config.json>
```

## Configuration

Here's a comprehensive guide to all available configuration fields:

### Top-Level Configuration

```json
{
  // Optional (default: launch mode). Browser context to use. You can connect to an existing browser instance via cdp, or let agent start a new instance (launch).
  "browserContext": { /* browser configuration */ },
  // Required. The configuration file detailing settings for the exploration
  "explorationConfig": { /* exploration configuration */ },
  // Optional. The release label for the site being tested. Bugs identified, test scenarios generated, will be tagged with this release in TestChimp platform.
  "appReleaseLabel": "local_default"
}
```

### Browser Context Configuration

```json
{
  "browserContext": {
    "mode": "launch" | "cdp",
    "cdpUrl": "http://localhost:9222",
    "headless": true | false
  }
}
```

- **mode**: Browser launch mode
  - `"launch"` - Launch a new browser instance
  - `"cdp"` - Connect to existing browser via Chrome DevTools Protocol
- **cdp_url**: Chrome DevTools Protocol URL (required when mode is "cdp")
- **headless**: Whether to run browser in headless mode

### Exploration Configuration

```json
{
  "explorationConfig": {
    "promptConfig": { /* prompt-based configuration */ },
    "maxCredits": 100,
    "maxJourneys": 5,
    "bugCaptureSettings": { /* bug capture configuration */ },
    "viewportConfig": { /* viewport configuration */ },
    "urlRegexToCapture": ".*\\.example\\.com.*"
  }
}
```

#### Prompt-Based Configuration

```json
{
  "promptConfig": {
    // Required: URL to visit
    "url": "https://example.com",
    // Optional - any additional instructions for context
    "explorePrompt": "Explore the website and find any issues",
    // Optional - any specific test input values to use
    "testDataPrompt": "Login: test@example.com pass: Password1"
  }
}
```

- **url**: Required. Target website URL to explore
- **explorePrompt**: Optional. Instructions for the AI agent on what to explore
- **testDataPrompt**: Optional. Instructions for any specific test input values to use
- **location**: Optional. specific location to focus on

#### Bug Capture Settings

```json
{
  "bugCaptureSettings": {
    "sources": ["dom", "screenshot", "network", "console"],
  }
}
```

- **sources**: Data sources to analyze (string values supported):
  - `"dom"` - DOM analysis for visual issues
  - `"screenshot"` - Screenshot analysis for visual issues  
  - `"network"` - Network request/response analysis
  - `"console"` - Console log analysis

#### Viewport Configuration

```json
{
  "viewportConfig": {
    "viewports": [
      {
        "nickname": "laptop" | "widescreen" | "mobile" | "tablet",
        "width": 1366,
        "height": 768
      }
    ]
  }
}
```

- **nickname**: Predefined viewport size (string values supported):
  - `"laptop"` - Standard laptop resolution
  - `"widescreen"` - Wide screen resolution
  - `"mobile"` - Mobile device resolution
  - `"tablet"` - Tablet device resolution
- **width**: Optional. Custom viewport width in pixels
- **height**: Optional. Custom viewport height in pixels

### Complete Example Configuration

```json
{
  "browserContext": {
    "mode": "cdp",
    "cdp_url": "http://localhost:9222",
    "headless": false
  },
  "explorationConfig": {
    "promptConfig": {
      "url": "https://example.com",
      "explorePrompt": "Explore the website and find any issues",
      "testDataPrompt": "Login with test@example.com password1"
    },
    "maxCredits": 100,
    "maxJourneys": 5,
    "bugCaptureSettings": {
      "sources": ["dom", "screenshot", "network", "console"]
    },
    "viewportConfig": {
      "viewports": [
        {
          "nickname": "laptop"
        }
      ]
    },
    "urlRegexToCapture": ".*\\.example\\.com.*"
  },
  "appReleaseLabel": "local_default"
}
```

## Reusing an existing browser session

To reuse your existing signed-in sessions (to circumvent 2FA, SSO limitation etc.) for agentic testing, follow the steps below:

1. Close your existing chrome browser instances.
2. Start chrome in CDP mode (below command):

In MacOS:

```
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-cdp
```

In Windows:

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir=C:\chrome-cdp
```

In Linux:

```
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-cdp
```

3. In your exploration config json file, specify the browser_context section as below, and it will connect to the browser instance via CDP, and reuse the existing sessions:

```
  "browserContext": {
    "mode": "cdp",
    "cdpUrl": "http://localhost:9222",
    "headless": false
  }
```
