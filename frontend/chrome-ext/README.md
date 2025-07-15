# TestChimp Chrome Extension

*Visual vibe coding on the browser, Identify and track bugs, fix in one click, brainstorm test scenarios and more...*

## TestChimp captures *Runtime behaviour Graph* of your webapp for context-aware assistance.

Much like how Cursor / Windsurf indexes your codebase to have richer context about your code for more tailored assistance, TestChimp AI agent autonomously explores your webapp to build a comprehensive *runtime behaviour graph* of your product for more context-aware assistance to your QA workflows.

With its explorations, it captures the different screens, states, and pathways in your product, detailed down to individual element level. Along the way it: 

- Captures the various bugs it finds in each screen, analyzing the DOM, Console, Network and Screenshots, catching 100s of common bugs that makes your app look and feel mediocre.
- Identifies test scenarios for each screen that should be tested, and writes test scripts.

## Chrome Extension

This [Chrome extension](https://chromewebstore.google.com/detail/testchimp-ai-co-pilot-for/ailhophdeloancmhdklbbkobcbbnbglm) is the companion that brings context-aware AI assistance of TestChimp, while you are on your webapp, testing.

1) *View issues / scenarios relevant to the current screen.*

Directly view the bugs and test scenarios *relevant for the current screen* you are in (identified by the agent as well as added manually) - while you are testing your webapp, making it a breeze to track what needs fixing on the screen, and what testing needs to be done.

2) *AI enabled bug finding*

Click on Find Bugs in the Bugs tab, and it will analyze the current DOM, recent console logs, recent network activity and screenshot of the current screen to identify bugs across many critical categories. You can add bugs manually as well, with relevant elements from the UI tagged - for richer, consolidated bug reports.

3) *Brainstorm test scenarios*

TestChimp can analyze the screen (taking in to account the complete product-context is has built with its' agentic runs) and come up with scenarios to test on the current screen - so that you don't miss crucial checks.  You can even ask it to focus on specific areas in the screen when brainstorming for scenarios.

You can mark scenario test results directly from the extension once manually tested, for seamless tracking. You can author scenarios right from the extension - with AI assistance for detailing out the steps for quick iteration.

4) *Record test sessions*

Capture not just the video but the complete API request / response payloads during your test session recordings. Share them easily with permalinks - great for adding to your Jira tickets, giving devs complete context for bugs. These recordings can then be used to generate:
 - API tests
- UI tests
- Documentations (Bug reports etc.) in one click, from TestChimp platform

=== Collaborate with your IDE, right from your browser ===

Install the TestChimp [VSCode extension](https://github.com/awarelabshq/testchimp-sdk/blob/main/frontend/vs-ext/README.md) on your AI enabled IDE (Cursor etc.), and the chrome extension will collaborate with it to get fixes done - without leaving your browser.

4) *Fix Bugs in one-click*

Click on any bug listed for the current page, and click *"Fix in IDE"*. The extension will collect all the necessary context for the bug, and prompt your IDE to fix the issue.

5) *Generate test scripts for scenarios*

Select any test scenario in the displayed list, and click on *"Generate script"*. The extension will prompt your IDE to generate test scripts matching your projects' code structure and style.

6) *Visual Vibe Coding*

Just point to elements / areas on your webapp and *"say the change you want to see"*. The extension will communicate the related files, screen details, and details about targeted elements added by you to the context window, to your IDE and get it implemented, making your vibe coding sessions even more seamless. 

There are a couple of (optional) additional tools that can greatly enhance your setup, together with this extension:

1. [TestChimp MCP Server](https://github.com/awarelabshq/testchimp-sdk/blob/main/localagent/mcp.md): The MCP server equips your IDE with tools for fetching additional runtime behaviour context, communicating with TestChimp servers and the chrome extension as needed.
2. [babel-plugin-source-mapper](https://github.com/awarelabshq/testchimp-sdk/blob/main/builders/babel/README.md): This babel plugin instruments your built artifacts with source file metadata, which is extracted by the Chrome extension to provide richer prompts to the IDE (specfiying exactly which files need to be updated for the fix requested).
