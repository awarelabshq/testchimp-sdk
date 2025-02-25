const { Builder, By, until } = require('selenium-webdriver');
const assert = require('assert');
const { TestChimpEval, ModelProvider } = require('testchimp-eval');

// Initialize TestChimpEval
const evaluator = new TestChimpEval();
evaluator.configure(ModelProvider.OPENAI, 'gpt-4o-mini', 'your-openai-api-key');

(async function testAIResponse() {
  let driver = await new Builder().forBrowser('chrome').build();

  try {
    await driver.get('https://chat.openai.com/');

    const userInput = 'What is the capital of France?';
    const goldenOutput = 'The capital of France is Paris.';

    // Enter input and submit
    let inputBox = await driver.findElement(By.css('textarea'));
    await inputBox.sendKeys(userInput);
    await inputBox.sendKeys('\n');

    // Wait for response
    let responseElement = await driver.wait(until.elementLocated(By.css('.response-text')), 10000);
    let aiOutput = await responseElement.getText();

    // Evaluate response
    let evalResult = await evaluator.evaluate("The output should correctly answer the question and be factually accurate.", aiOutput, userInput, goldenOutput);

    assert.strictEqual(evalResult.result, true);

  } finally {
    await driver.quit();
  }
})();