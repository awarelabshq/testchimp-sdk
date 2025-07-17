# TestChimp VS Code extension

## Introduction

TestChimp VSCode extension acts as a bridge between your VS based IDEs (such as [Cursor](https://cursor.so)), and the [TestChimp Chrome extension](https://chromewebstore.google.com/detail/testchimp-ai-co-pilot-for/ailhophdeloancmhdklbbkobcbbnbglm), to provide a seamless shift-left experience for QA and dev workflows enabling:

#### Visual Vibe Coding

Just Point and "Say the change you want to see". TestChimp Chrome extension will communicate with the VSCode extension to prompt your AI assistant to make the adjustment requested, passing the complete context about the related files, target components details (ancestry hierarchy, computed styles etc.) and the fix requested.

#### Fix Bugs directly from the browser

TestChimp displays all bugs captured for a given screen in the Chrome extension (both Agent discovered as well as manually reported). With the VS Code extension installed, you can simply click *"Fix in IDE"* on the bug, and it will communicate with the VSCode extension to prompt the AI assistant in your IDE.

#### Generate test scripts for test scenarios

 Similar to bugs, the chrome extension displays all test scenarios identified (both agentically as well as manually added) for the current screen. You can click on *"Generate script in IDE"*, which will communicate with VS Code extension to prompt the AI assistant to generate test scripts - in your codebases' style and structure.

## Installation Guide

1. Download the vsix file from [here](https://github.com/awarelabshq/testchimp-sdk/blob/main/frontend/vs-ext/releases/testchimp-vs-extension-0.0.2.vsix).
2. Open Command Palette in Cursor IDE, then select: *Extensions: Install from VSIX...*, and select the downloaded file.
3. Once installed, Open Command Palette and run *Start TestChimp Bridge*

This will open a websocket (listening on port 53333 by default, which can be changed in extension settings) communicating with the TestChimp Chrome extension. 
Make sure you have installed our [Chrome extension](https://chromewebstore.google.com/detail/testchimp-ai-co-pilot-for/ailhophdeloancmhdklbbkobcbbnbglm), and have started it.

You should see the VSCode: Connected status indicator in the Chrome extension.

## Optional - TestChimp MCP Server

TestChimp MCP is a locally runnable MCP server that brings the runtime behaviour graph context to your Cursor IDE, enabling richer context for dev / QA tasks. The MCP server will also communicate with the Chrome extension to pull in additional information from your browser, such as recent console logs, network activity and DOM details about specific elements, enabling your IDE to reason about the tasks with better runtime context awareness.

For installation and setup guidance for MCP server, refer [here](https://github.com/awarelabshq/testchimp-sdk/blob/main/localagent/mcp.md).

## Optional - babel-plugin-source-mapper

If your webapp is based on [React](https://react.dev/), then you can use the custom babel plugin: [babel-plugin-source-mapper](https://github.com/awarelabshq/testchimp-sdk/tree/main/builders/babel), which instruments the built artifacts with source file information, and TestChimp Chrome Extension can extract the source file information related to the current screen and provide them when prompting your IDE, for richer context.
