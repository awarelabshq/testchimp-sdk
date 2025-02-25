# TestChimp Evals Library

The testchimp-eval-js library provides a way to evaluate AI-generated text against specific criteria using LLM evaluator models. The library integrates with the OpenAI API to provide a simple interface for evaluating text, offering flexibility to include context and compare the output against a golden output.
This is meant as a thin wrapper library for easy usage in E2E test scripts such as playwright, cypress and selenium js.

Features

* Model Configuration: Allows configuration of the model provider and API key.
* Evaluation: Evaluate AI-generated text against given criteria.
* Simple result json for easy consumption in test scripts.
* Support for Golden Output: Compare AI output to a predefined “golden” output.
* Customizable: Easily extendable to support other model providers.

## Installation

run ```npm install testchimp-eval-js```

## Usage

1. Import the Library

First, import the library into your project:

```commandline
const { TestChimpEval, ModelProvider } = require('testchimp-eval');
```

2. Configure the Library

You need to configure the library with the model provider, model, and API key before calling any evaluation. For now, it only supports OpenAI as a model provider.
```
const evaluator = new TestChimpEval();

// Configure OpenAI with your API key
evaluator.configure(ModelProvider.OPENAI, 'gpt-4o-mini', 'your-openai-api-key');
```

3. Call ```evaluate```

Once configured, you can evaluate AI-generated text outputs against a given criteria by calling ```evaluator.evaluate``` function. 
Optionally, you can also provide a golden output to compare against, and prior context (such as user input query).

method signature for evaluate function:

```commandline
evaluate("criteria","textToTest","inputContext","goldenOutput");
```

this returns a result json object of following format:

```commandline
{
    result: <true / false>,
    confidence:(0 to 1)
}
```

* ```result```: Boolean indicating whether the evaluation passed.
* ```confidence```: Confidence score indicating how sure the model is about the result.

## Examples

#### 1. Evaluate ```Text``` meets ```criteria```:
```commandline
const textToTest = "This is a sample output from an AI model.";

const eval = await evaluator.evaluate("The output must be grammatically correct", textToTest);
assert(eval.result).toBe(true);
```

#### 2. Evaluate ```Output``` is relevant for a ```user input```

```commandline
const eval = await evaluator.evaluate("Answer must be relavant",
    "Here are some air tickets for your journey from London to San Fransisco",
    "Give me tickets from London to Silicon Valley");
```

#### 3. Evaluate ```Output``` is similar to a predefined ```Golden Output```

```commandline
const eval = await evaluator.evaluate("Answer must not assume user location if not provided",
    "Here are some air tickets for your journey from London to San Fransisco",
    "Can you provide me tickets to SF",
    "Please provide your starting location");
```

For complete examples in playwright / cypress / selenium js, refer to examples/ folder.

Model Providers

Currently, only OpenAI is supported, but the library is structured to easily extend with other providers in the future (e.g., Claude, Mistral, Gemini).
* OPENAI: Uses the OpenAI API for evaluation.
* CLAUDE, MISTRAL, GEMINI: Placeholder models for future expansion.


## License

This project is licensed under the GPL-3.0 License.