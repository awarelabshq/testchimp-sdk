const axios = require("axios");

const ModelProvider = Object.freeze({
  OPENAI: "openai",
  CLAUDE: "claude",
  MISTRAL: "mistral",
  GEMINI: "gemini",
});

class TestChimpEval {
  constructor() {
    this.config = {
      modelProvider: null,
      model: null,
      apiKey: null,
    };
  }

  config(modelProvider, model, apiKey) {
    if (!Object.values(ModelProvider).includes(modelProvider)) {
      throw new Error("Unsupported model provider");
    }
    this.config.modelProvider = modelProvider;
    this.config.model = model;
    this.config.apiKey = apiKey;
  }

  async evaluate(criteria, llmOutput, llmInput = "", goldenOutput = "") {
    if (!this.config.modelProvider || !this.config.model || !this.config.apiKey) {
      throw new Error("Model provider, model, and API key must be configured first.");
    }

    const prompt = this.createPrompt(criteria, llmOutput, llmInput, goldenOutput);
    try {
      const response = await this.callModelAPI(prompt);
      return response;
    } catch (error) {
      console.error("Error calling LLM API:", error);
      return { result: false, confidence: 0 };
    }
  }

  createPrompt(criteria, llmOutput, llmInput, goldenOutput) {
    return `Evaluate the following AI-generated output based on the given criteria.
Criteria: ${criteria}
LLM Output: ${llmOutput}
${llmInput ? `LLM Input: ${llmInput}\n` : ""}${goldenOutput ? `Golden Output: ${goldenOutput}\n` : ""}
Respond strictly in JSON format: { "result": true/false, "confidence": 0 to 1 }.`;
  }

  async callModelAPI(prompt) {
    const apiUrl = this.getApiUrl();
    const requestBody = this.getRequestBody(prompt);
    const headers = { "Authorization": `Bearer ${this.config.apiKey}` };

    const response = await axios.post(apiUrl, requestBody, { headers });
    return response.data;
  }

  getApiUrl() {
    switch (this.config.modelProvider) {
      case ModelProvider.OPENAI:
        return "https://api.openai.com/v1/chat/completions";
      case ModelProvider.CLAUDE:
        return "https://api.anthropic.com/v1/messages";
      case ModelProvider.MISTRAL:
        return "https://api.mistral.ai/v1/chat/completions";
      case ModelProvider.GEMINI:
        return "https://generativelanguage.googleapis.com/v1beta/models/gemini:generateContent";
      default:
        throw new Error("Unsupported model provider");
    }
  }

  getRequestBody(prompt) {
    switch (this.config.modelProvider) {
      case ModelProvider.OPENAI:
        return {
          model: this.config.model,
          messages: [{ role: "system", content: "You are an AI evaluator." }, { role: "user", content: prompt }],
          temperature: 0,
          response_format: "json",
        };
      case ModelProvider.CLAUDE:
        return {
          model: this.config.model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1024,
          metadata: { response_format: "json" },
        };
      case ModelProvider.MISTRAL:
        return {
          model: this.config.model,
          messages: [{ role: "system", content: "You are an AI evaluator." }, { role: "user", content: prompt }],
          temperature: 0,
        };
      case ModelProvider.GEMINI:
        return {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        };
      default:
        throw new Error("Unsupported model provider");
    }
  }
}

module.exports = { TestChimpEval: new TestChimpEval(), ModelProvider };
