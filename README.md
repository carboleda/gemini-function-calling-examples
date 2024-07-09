# function-calling-examples

Several examples of function calling using Google Gemini models in Typescript

### How to configure it

1. Make a copy to the `.env.template` file and name it `.env`
1. Generate an API Key in [Google AI Studio](https://aistudio.google.com/app/apikey) and put it in the `.env` file
1. Install dependencies
    ```sh
    npm i
    ```

### Examples you'll find here

1. Intro to Function Calling `npm run start:intro`
1. Data Structures
    - Single parameter `npm run start:data:single`
    - Multiple parameters `npm run start:data:multiple`
    - Lists of parameters `npm run start:data:list`
    - Nested parameters and data structures `npm run start:data:nested`
3. Parallel Function Calls `npm run start:parallel`

[!IMPORTANT] This repository is based in the official [generative-ai](https://github.com/GoogleCloudPlatform/generative-ai/tree/main/gemini/function-calling) repository created in Python.