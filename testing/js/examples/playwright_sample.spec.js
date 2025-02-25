const { chromium } = require('playwright');
const { TestChimpEval, ModelProvider } = require('testchimp-eval');

// Initialize TestChimpEval
const evaluator = new TestChimpEval();
evaluator.configure(ModelProvider.OPENAI, 'gpt-4o-mini', 'your-openai-api-key');

(async () => {
  // Initialize Playwright
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Navigate to a webpage with AI-generated text (Example: ChatGPT)
  await page.goto('https://chat.openai.com/');

  // Assume we input a question and get AI-generated text
  const userInput='What is the capital of France?';
  await page.fill('textarea', );
  await page.press('textarea', 'Enter');

  // Wait for response (adjust selector based on actual UI)
  await page.waitForSelector('.response-text');

  // Extract AI-generated text from the page
  const aiOutput = await page.textContent('.response-text');


  // Define evaluation criteria
  const goldenOutput = "The capital of France is Paris.";

  // Evaluate the AI-generated response
  const eval = await evaluator.evaluate("The output should correctly answer the question and be factually accurate.", aiOutput, userInput, goldenOutput);

  assert(eval.result).toBe(true);

  // Close the browser
  await browser.close();
})();