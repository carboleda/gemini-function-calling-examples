# Intro to Function Calling with the Gemini API & Javascript SDK

### Overview

#### Gemini
Gemini is a family of generative AI models developed by Google DeepMind that is designed for multimodal use cases.

#### Calling functions from Gemini
Function Calling in Gemini lets developers create a description of a function in their code, then pass that description to a language model in a request. The response from the model includes the name of a function that matches the description and the arguments to call it with.

#### Why function calling?
When working with generative text models, it can be difficult to coerce generative models to give consistent outputs in a structured format such as JSON. Function Calling in Gemini allows you to overcome this limitation by forcing the model to output structured data in the format and schema that you define.

You can think of Function Calling as a way to get structured output from user prompts and function definitions, use that structured output to make an API request to an external system, then return the function response to the generative model so that it can generate a natural language summary. In other words, function calling in Gemini helps you go from unstructured text in prompt, to a structured data object, and back to natural language again.

#### Objectives
In this tutorial, you will learn how to use the Gemini API with the Generative AI SDK for Javascript to make function calls via the Gemini 1.5 Flash (`gemini-1.5-flash`) model.

You will complete the following tasks:

- Install the Generative AI SDK for Javascript
- Gat an API Key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Use the Generative AI SDK to interact with the Gemini 1.5 Flash (`gemini-1.5-flash`) model:
  - Generate function calls from a text prompt to get the current time in a given location
