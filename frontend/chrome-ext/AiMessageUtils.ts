// Utility functions for formatting AI messages for various contexts
import { UserInstructionMessage } from './datas';
import { Bug } from './bugs/bugUtils';
import { AgentTestScenarioWithStatus } from './scenarios/scenarioUtils';

// 1. formatMessageForAI (from dev/DevTab.tsx)
export function formatDevTaskForAi(msg: UserInstructionMessage): string {
    let result = '# requirement:\n' + msg.userInstruction + '\n';
    if (msg.infoContext) {
        result += '\nFollowing are the related components / areas referred in the screen by the user for this requirement:\n';
        result += JSON.stringify(msg.infoContext.contextElements, null, 2) + '\n';
        if (msg.infoContext.screenInfo) {
            const { relativeUrl, filePaths } = msg.infoContext.screenInfo;
            if (relativeUrl) {
                result += `\nThe screen's relative URL is: ${relativeUrl}\n`;
            }
            if (filePaths && filePaths.length > 0) {
                result += `\nHere are some potential file paths related to the screen:\n`;
                result += filePaths.map(f => `- ${f}`).join('\n') + '\n';
            }
        }
    }
    result += getMcpInstructions();
    return result;
}

// 2. formatMessageToAiIde (from bugs/bugUtils.ts)
export function formatBugTaskForAi(
  bug: Bug,
  screenName?: string,
  filePaths?: string[],
  relativeUrl?: string
): string {
  let result = 'Fix the following bug in the codebase:';
  if (bug.title) {
    result += `\nTitle: ${bug.title}`;
  }
  if (bug.description) {
    result += `\nDescription: ${bug.description}`;
  }
  if (screenName) {
    result += `\nScreen: ${screenName}`;
  }
  if (relativeUrl) {
    result += `\nScreen relative URL: ${relativeUrl}`;
  }
  if (filePaths && filePaths.length > 0) {
    result += `\nHere are some potential file paths related to the screen:`;
    result += filePaths.map(f => `\n- ${f}`).join('');
  }

  result +=  getMcpInstructions();
  return result;
}

// 3. formatScenarioScriptForIde (from scenarios/scenarioUtils.ts)
export function formatScenarioTaskForAi(scenario: AgentTestScenarioWithStatus): string {
  const introText = `Below is a test scenario for which you are expected to write a test script. 
  
  Structure guidance:
  
  Refer to the worskpaces' current e2e tests structure, and adhere to that.
  eg: if using page object model, use the already defined abstractions whenever sensible. If new objects should be defined, refactor as needed.

  Ensure assertions are added that verify that expected behaviour.
  
  Language: If no tests exist, write in playwright js. If the workspace has tests already, adhere to that language choice.

  Verification: Once written, invoke the test to verify that it is working as intended, and show the result.
  ====

  `;

  const title = `Title: ${scenario?.scenario?.title || ''}`;
  const expected = `Expected behaviour: ${scenario?.scenario?.expectedBehaviour || ''}`;
  const steps = scenario?.scenario?.steps || [];

  const stepsJson = steps.map((step) => {
    const entry: Record<string, string> = {};
    if (step.description) entry.description = step.description;
    if (step.semanticCode) entry.semanticCode = step.semanticCode;
    return entry;
  });

  const stepsText = `Test steps: ${JSON.stringify(stepsJson, null, 2)}`; // Pretty-printed JSON



  return `${introText}

Test Scenario: ${title}

Expected Behaviour:
${expected}

Steps:
${stepsText}

${getMcpInstructions()}`;
} 

function getMcpInstructions():string{
    return `
    ====
    
  # TestChimp MCP tool usage
  
    If TestChimp MCP server is installed and configured, you may have access to the following tools for follow up / to get additional contextual information - to implement the request. Call them as needed.
  
    ## Tools for getting the current browser UI context:
    
    **fetch_extra_info_for_context_item**
  
    You can pass the id of the context element (referred in the above section), and get additional information about UI elements which will give you complete computed styles, full attribute map etc. This is useful for getting a clearer idea about the UI elements being referred in the request.
  
    **get_recent_console_logs**
  
    You can request for the last N logs of a given level or above (info, warn, error), to see if there are logs that could indicate root cause of issues / troubleshooting
  
    **get_recent_request_response_pairs**
    
    You can request for the last N request_response pairs (headers only), to see if any api calls failed / any issues with the requests made, to identify root causes and troubleshoot as needed.
  
    **get_dom_snapshot**
    
    This returns an LLM friendly snapshot of the current page in the browser. Call this tool for understanding the complete current page UI for resolving visual issues. 
    You can also use this for verifying that the fix implemented is successful (wait for the hot reload to complete after the changes are done).
  
    ## Tools for getting applications' runtime behaviour context:
  
    TestChimp has a comprehensive understanding of the runtime behaviour of the webapp being built (generated by an autonomous agent that walks through the app during runtime). 
    The following tools can be used for querying the runtime behaviour graph to get a better understanding of how the app behaves.
  
    **get_runtime_behaviour_graph**  
  
    Returns a structured graph representing the application's runtime behaviour, including:
    - A high-level summary of the application's purpose
    - The different screens present in the app
    - The various states each screen can be in
    - Key UI element groups on each screen
    - Navigation pathways between screens, and the actions that trigger them
    
    This is helpful for understanding product context when doing more granular tasks.
  
    **get_ui_node_details**  
  
    Returns detailed information about a specific UI scope within the runtime behaviour graph:
    - You can query by screen, screen + state, or screen + state + element group
    - If only a screen is specified, full details for that screen are returned
    - If screen + state + group are specified, only that group’s details are returned
    
    Use this to inspect UI structure and visible elements at different levels of granularity to get deeper understanding of the product at a specific scope.
    
    **ask_runtime_behaviour**  
  
    Allows you to ask freeform natural language questions about the application's runtime behaviour.  
    An LLM will use the complete runtime behaviour graph to answer your question.
    `;
}