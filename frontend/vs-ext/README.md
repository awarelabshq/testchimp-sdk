# TestChimp VS Extension

A VSCode extension enabling:
- AI driven test script generation from plain-english scenarios,
- AI test healing, and
- collaboration with TestChimp Chrome Extension for browser-in-the-loop agentic coding sessions.

## Prerequisites

Before using this extension, ensure you have the following installed:

- **Playwright**: Required for running test scripts
  - Install via npm: `npm install playwright`
  - Install browsers: `npx playwright install`

## Installation

### VS Code
- Search for "TestChimp" in the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=TestChimp.testchimp-vs-extension) and install the extension

### Cursor
- Download the [latest VSIX file](https://github.com/awarelabshq/testchimp-sdk/blob/main/frontend/vs-ext/releases/testchimp-vs-extension-0.0.7.vsix)
- Install using VSIX: In Cursor, open Command Palette (Cmd+Shift+P) → Install with VSIX → Select the downloaded file

## Features

### 🚀 New AI-Powered Capabilities
- **Generate Script**: Create Playwright test scripts from natural language descriptions with AI
- **Run with AI Repair**: Execute tests with intelligent AI-powered error detection and automatic repair

### 🔗 Bridge Functionality
This extension serves as a communication bridge between the TestChimp Chrome extension and VS Code to enable seamless browser-to-IDE communication for visual coding.

#### Visual Vibe Coding
Just point and "say the change you want to see". TestChimp Chrome extension will communicate with the VSCode extension to prompt your AI assistant to make the adjustment requested, passing the complete context about the related files, target components details (ancestry hierarchy, computed styles etc.) and the fix requested.

#### Fix Bugs directly from the browser
TestChimp displays all bugs captured for a given screen in the Chrome extension (both Agent discovered as well as manually reported). With the VS Code extension installed, you can simply click "Fix in IDE" on the bug, and it will communicate with the VSCode extension to prompt the AI assistant in your IDE.

## Configuration

The extension can be configured through VSCode settings:

### Authentication Settings (Required for AI Operations)
- **Setting**: `testchimp.userAuthKey`
- **Type**: `string`
- **Description**: User authentication key for TestChimp API access
- **Required**: Yes (for AI operations)

- **Setting**: `testchimp.userMail`
- **Type**: `string`
- **Description**: User email for TestChimp API access
- **Required**: Yes (for AI operations)

### WebSocket Port
- **Setting**: `testchimp.websocketPort`
- **Default**: `53333`
- **Range**: `1024` - `65535`
- **Description**: Port number for the WebSocket server

### Deflake Runs
- **Setting**: `testchimp.deflakeRuns`
- **Type**: `number`
- **Default**: `1`
- **Description**: Number of times to attempt deflaking a test before AI repair is triggered

## Commands

### AI-Powered Commands
- `TestChimp: Generate Script`: Creates Playwright test scripts from scenario descriptions
- `TestChimp: Run with AI Repair`: Executes tests with AI-powered error repair
- `TestChimp: Run Test`: Executes tests without AI repair

### Bridge Commands
- `Start TestChimp Bridge`: Starts the WebSocket server
- `Stop TestChimp Bridge`: Stops the WebSocket server

## Usage

### Setup
1. Install the extension (see Installation section above)
2. **Configure authentication settings** (required for AI operations):
   - Set `testchimp.userAuthKey` to your TestChimp authentication key
   - Set `testchimp.userMail` to your TestChimp email
4. Use the "Start TestChimp Bridge" command to start the server
5. The server will listen for messages from the TestChimp Chrome extension
6. Install the TestChimp chrome extension from Chrome Web store here: https://chromewebstore.google.com/detail/testchimp-generate-ui-api/ailhophdeloancmhdklbbkobcbbnbglm

### Generate Script from Scenario

1. Write your test scenario in plain English steps in a text file. Save it.
2. Right click on the file, select **TestChimp → Generate Script**.
3. This will write the generated script in the tests folder.

### Run Script With AI Repair

1. Open the test script file.
2. Right click → **TestChimp → Run with AI Repair**
3. The test will be attempted as is, then deflaked (the number of times deflaking is attempted can be configured in the extension settings). If it still fails, the agent will repair the script and write the updated test.

## Troubleshooting

If you encounter a "Port already in use" error:
1. Change the port in VSCode settings (`testchimp.websocketPort`)
2. Or stop the service currently using the port
3. Restart the WebSocket server

## Optional - TestChimp MCP Server

TestChimp MCP is a locally runnable MCP server that brings the runtime behaviour graph context to your Cursor IDE, enabling richer context for dev / QA tasks. The MCP server will also communicate with the Chrome extension to pull in additional information from your browser, such as recent console logs, network activity and DOM details about specific elements, enabling your IDE to reason about the tasks with better runtime context awareness.

For installation and setup guidance for MCP server, refer [here](https://github.com/awarelabshq/testchimp-sdk/blob/main/localagent/mcp.md).

## Optional - babel-plugin-source-mapper

If your webapp is based on [React](https://react.dev/), then you can use the custom babel plugin: [babel-plugin-source-mapper](https://github.com/awarelabshq/testchimp-sdk/tree/main/builders/babel), which instruments the built artifacts with source file information, and TestChimp Chrome Extension can extract the source file information related to the current screen and provide them when prompting your IDE, for richer context.
