// Utility functions for scenarios
import { AgentTestScenarioWithStatus} from '../datas';

export function truncateStepText(text: string, maxLength: number): string {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) + '…' : text;
}

export function getLastNSteps(steps: any[], n: number, maxLength: number): string {
  if (!Array.isArray(steps)) return '';
  const lastSteps = steps.slice(-n);
  return lastSteps
    .map(step => truncateStepText(step.description || '', maxLength))
    .join('\n');
}

/**
 * Formats a scenario as a prompt for the IDE.
 * @param scenario AgentTestScenarioWithStatus
 * @returns string prompt for IDE
 */
export function formatScenarioScriptForIde(scenario: AgentTestScenarioWithStatus): string {
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

  const instructText = `
  ====
  
  If the TestChimp MCP server is installed, you may have access to the following tools for requesting structured information about the application's runtime behaviour:
  
  **get_runtime_behaviour_graph**  

  Returns a structured graph representing the application's runtime behaviour, including:
  - A high-level summary of the application's purpose
  - The different screens present in the app
  - The various states each screen can be in
  - Key UI element groups on each screen
  - Navigation pathways between screens, and the actions that trigger them
  
  This gives you a mental model of how the application behaves from a user's perspective.
  
  **get_ui_node_details**  

  Returns detailed information about a specific UI scope within the runtime behaviour graph:
  - You can query by screen, screen + state, or screen + state + element group
  - If only a screen is specified, full details for that screen are returned
  - If screen + state + group are specified, only that group’s details are returned
  
  Use this to inspect UI structure and visible elements at different levels of granularity.
  
  **ask_runtime_behaviour**  

  Allows you to ask freeform natural language questions about the application's runtime behaviour.  
  An LLM will use the runtime behaviour graph to answer the question.

  Aditionally, the following tools may be available for fetching current DOM related information:
  
  **get_dom_snapshot**

  - Returns a simplified structured representation of the current screens' DOM (useful for accurate selector implementation for the current page). 
  - It will also return additional screen metadata such as relative url, logical screen name + state.
  `;

  return `${introText}

Test Scenario: ${title}

Expected Behaviour:
${expected}

Steps:
${stepsText}

${instructText}`;
}