# TestChimp Local Agent as an MCP Server

*Give your Cursor IDE superpowers with Runtime context awareness about your webapp*

## Preamble

The TestChimp Local Agent doubles up as an MCP server that MCP Clients such as [Cursor](https://cursor.so), [Claude Desktop](https://claude.ai/download) can interact with to get richer runtime context awareness about your webapp.

TestChimp's autonomous AI agent crawls through your webapp to identify different screens, states and pathways in your app, detailed down to individual element level, to build a comprehensive *Runtime behaviour Graph* (a.k.a MindMap) about your webapp. 
Along the way, it scans DOM, Screenshots, console logs and network acitivity to capture 100s of common bugs, as well as identify test scenarios to consider for each screen.

The [TestChimp Chrome extension](https://chromewebstore.google.com/detail/testchimp-ai-co-pilot-for/ailhophdeloancmhdklbbkobcbbnbglm) brings those insights (bugs it identified, test scenarios generated) to right when you are testing your site, acting as an AI companion that has thorough understanding about what you are building.
The chrome extension works with your Cursor IDE (through our [VSCode extension](https://github.com/awarelabshq/testchimp-sdk/tree/main/frontend/vs-ext)) to enable:
- *Visual Vibe Coding* - just point and "say the change you want to see". Chrome extension will communicate with the IDE and get the request implemented by providing the IDE with detailed context about the elements on the screen.
- *Fix bugs in IDE* - Click on any bug listed for the screen, and get it fixed in the IDE
- *Generate scripts for scenarios* - Click on any test scenario, and get a test script generated for it in your IDE.

## MCP Server

This MCP server provides Cursor with tools that allow for querying the complete runtime behaviour graph about your webapp, as well as additional information about the current browser state by interacting with the Chrome extension, whenever additional context is needed for supporting the above use cases. 
For instance if Cursor decides it wants to check the recent console logs to determine a root cause of a bug, it can call the *get_recent_console_logs* tool exposed by this MCP server, to fetch them and use them to better understand the bug and resolve it.

Following are the 7 tools this MCP server exposes:

Overall app behaviour related:

1. *get_runtime_behaviour_graph*: This returns an overview of the runtime behaviour graph that TestChimp has built about your webapp (capturing different screens, states, pathways, and additional metadata such as related file paths etc.)
2. *get_ui_node_details*: This allows for querying details about a specific screen / state / element group in the app - which will give the descendents of the node and more detailed metadata (when Cursor wants to dig deeper in to a specific component behaviour)
3. *ask_runtime_behaviour*: This allows Cursor to communicate in free text and ask questions about the runtime behaviour in free form, for any specific information it wants for the current task.

Current Browser State related:

4. *fetch_extra_info_for_context_item*: When chrome extension prompts the IDE, it provides context elements related to the task (such as areas / elements the user selected on the screen). This action allows for querying more detailed information about a specific context item - so that Cursor can get more details on demand.
5. *get_recent_console_logs*: This allows Cursor to get recent console logs (or specific level or above), in order to inspect and decide on course of action for fixing bugs.
6. *get_recent_request_response_pairs*: This returns redacted request / response headers for inspection and resolution of bugs (to understand how backend interactions are done and resolve issues)
7. *get_dom_snapshot*: This gives a simplified LLM friendly version of the current screens' DOM for the IDE to reason about the UI, to get a broader understanding about the overall screen.

## Installation and Setup

Prerequisites: Python 3.11 or above required.

1. Install testchimp-local python package

```
pip install testchimp-local
```

2. Configure environment variables

To authenticate the local server and sync it with your TestChimp project, set the following environment variables:

- `TESTCHIMP_EMAIL`: The email address of your testchimp account
- `TESTCHIMP_PAT`: Your PAT (Personal Access Token). This can be found by logging in to your TestChimp account and going to user settings (Click on your profile at bottom of the sidebar)
- `TESTCHIMP_PROJECT_ID`: The project id of your TestChimp Project. This can be found by going to Project Settings (Select the project in Sidebar, then click on Settings at the top right corner of the projects drawer).
  
3. Start testchimp-local

Simply Run:
```
testchimp-local
```

(It starts a server at port 43449 by default. You can change if needed by passing optional argument --port).

4. Configure Cursor to use it as an MCP server

In your Cursor IDE, add the following json to the mcp servers config:
```
{
  "mcpServers": {
    ... // Your other MCP servers
    "testchimp":{
      "url":"http://localhost:43449/mcp/"
    }
  }
}
```

If you changed the port, remember to update the url in the mcp server config above too.

That's it! Now Cursor can interact with it to query for your runtime behaviour for any tasks needed.

## More Resources

- [TestChimp VSCode extension](https://github.com/awarelabshq/testchimp-sdk/tree/main/frontend/vs-ext): For bridging communication between the chrome extension as Cursor IDE.
- [babel-plugin-source-mapper](https://github.com/awarelabshq/testchimp-sdk/tree/main/builders/babel): A Babel plugin that instruments your built artifacts with source file metadata, enabling TestChimp Extension to provide richer context to the IDE (to instruct exactly which files are related to the current components on the screen).
  
