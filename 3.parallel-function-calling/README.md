# Working with Parallel Function Calls and Multiple Function Responses in Gemini

### Overview

Gemini is a family of generative AI models developed by Google DeepMind that is designed for multimodal use cases. The Gemini API gives you access to the Gemini Pro and Gemini Pro Vision models.

Function Calling in Gemini lets you create a description of a function in your code, then pass that description to a language model in a request. The response from the model includes the name of a function that matches the description and the arguments to call it with.

In this tutorial, you'll learn how to work with parallel function calling within Gemini Function Calling, including:

- Handling parallel function calls for repeated functions
- Working with parallel function calls across multiple functions
- Extracting multiple function calls from a Gemini response
- Calling multiple functions and returning them to Gemini

#### What is parallel function calling?
In previous versions of the Gemini Pro models (prior to May 2024), Gemini would return two or more chained function calls if the model determined that more than one function call was needed before returning a natural language summary. Here, a chained function call means that you get the first function call response, return the API data to Gemini, get a second function call response, return the API data to Gemini, and so on.

In recent versions of specific Gemini Pro models (from May 2024 and on), Gemini has the ability to return two or more function calls in parallel (i.e., two or more function call responses within the first function call response object). Parallel function calling allows you to fan out and parallelize your API calls or other actions that you perform in your application code, so you don't have to work through each function call response and return one-by-one! Refer to the Gemini Function Calling documentation for more information on which Gemini model versions support parallel function calling.

Original example in Python https://github.com/GoogleCloudPlatform/generative-ai/blob/main/gemini/function-calling/parallel_function_calling.ipynb