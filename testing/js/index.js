const { OpenAI } = require("openai");

const ModelProvider = Object.freeze({
  OPENAI: "openai",
  CLAUDE: "claude",
  MISTRAL: "mistral",
  GEMINI: "gemini",
});

class TestChimpEval {
  constructor() {
    this.config = {
      modelProvider:null,
      model: null,
      apiKey: null,
    };

    this.openai = null;
  }

  // Configures the model and API key for OpenAI
  configure(modelProvider,model, apiKey) {
    if (!modelProvider || !model || !apiKey) {
      throw new Error("Model Provider, Model and API key must be provided.");
    }
    this.config.modelProvider=modelProvider;
    this.config.model = model;
    this.config.apiKey = apiKey;

    if(modelProvider==ModelProvider.OPENAI){
        // Initialize OpenAI SDK with the provided API key
        this.openai = new OpenAI({
          apiKey: this.config.apiKey,
        });
    }
  }

  /** Evaluates textToTest for the given criteria.
    llmContext: If the textToTest is an LLM response to a prior query, pass it as llmContext
    goldenOutput: If there is a golden output to compare against for validation, pass it here.
   **/
  async evaluate(criteria, textToTest, llmContext = "", goldenOutput = "") {
    if (!this.config.model || !this.config.apiKey) {
      throw new Error("Model and API key must be configured first.");
    }

    const prompt = this.createPrompt(criteria, textToTest, llmContext, goldenOutput);
    try {
      const response = await this.callModelAPI(prompt);
      return response;
    } catch (error) {
      console.error("Error calling OpenAI API:", error);
      return { result: false, confidence: 0 };
    }
  }

// Creates the prompt based on the criteria and output
createPrompt(criteria, llmOutput, llmInput, goldenOutput) {
  return `Evaluate the following AI-generated output based on the given criteria.
Criteria: ${criteria}
LLM Output: ${llmOutput}
${llmInput ? `LLM Input: ${llmInput}\n` : ""}${goldenOutput ? `Expected Output: ${goldenOutput}\n` : ""}
Respond strictly in JSON format: { "result": true/false, "confidence": 0 to 1 }.`;
}

// Calls OpenAI API and retrieves the response
async callModelAPI(prompt) {
  try {
    const response = await this.openai.chat.completions.create({
      model: this.config.model,
      messages: [
        { role: "system", content: "You are an AI evaluator." },
        { role: "user", content: prompt },
      ],
      temperature: 0,
      n: 1,
    });

    // Return the raw response content as is, which should be in JSON format
    const result = response.choices[0].message.content;
    return JSON.parse(result);  // Ensuring that the response is parsed as JSON
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    return { result: false, confidence: 0 };
  }
}
}

module.exports = { TestChimpEval, ModelProvider };