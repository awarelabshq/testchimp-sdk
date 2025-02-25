/// <reference types="cypress" />
const { TestChimpEval, ModelProvider } = require('testchimp-eval');

// Initialize TestChimpEval
const evaluator = new TestChimpEval();
evaluator.configure(ModelProvider.OPENAI, 'gpt-4o-mini', 'your-openai-api-key');

describe('AI Response Evaluation', () => {
  it('should evaluate AI-generated text correctly', () => {
    const userInput = 'What is the capital of France?';
    const goldenOutput = 'The capital of France is Paris.';

    cy.visit('https://chat.openai.com/');

    // Enter user input and submit
    cy.get('textarea').type(userInput).type('{enter}');

    // Wait for response and extract AI output
    cy.get('.response-text', { timeout: 10000 }).should('be.visible').invoke('text').then((aiOutput) => {
      // Evaluate response
      evaluator.evaluate("The output should correctly answer the question and be factually accurate.", aiOutput, userInput, goldenOutput).then((eval) => {
        expect(eval.result).to.be.true;
      });
    });
  });
});