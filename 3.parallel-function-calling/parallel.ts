import {
  FunctionResponse,
  FunctionResponsePart,
  GoogleGenerativeAI,
} from "@google/generative-ai";
import { NodeFileSystem } from "./node-file-system";

export const genAI = new GoogleGenerativeAI(process.env.API_KEY || "");
const nfs = new NodeFileSystem(
  "3.parallel-function-calling/local-files/ai-project"
);

const tools = [nfs.metadata];
const systemInstruction = `You are an expert Javascript developer, you can create files and write code as you need.
  Do not respond with the whole code, instead use the tools to create each file.`;

const model = genAI.getGenerativeModel(
  {
    model: "gemini-1.5-flash-latest",
    tools,
    generationConfig: {
      temperature: 0,
    },
  },
  { apiVersion: "v1beta" }
);

(async () => {
  const prompt = `${systemInstruction}.
  Create a sample expressjs application using the MVC pattern. The application should include:
  1. A GET /login route that renders a form with user and password fields
  2. A POST "/login" route to authenticate the user agains mongodb
  3. A GET /dashboard route to redirect the user after successful authentication`;

  const chat = model.startChat();
  const result = await chat.sendMessage(prompt);
  const functionCalls = result?.response?.functionCalls() || [];

  const apiResponse: FunctionResponse[] = [];
  for (const functionCall of functionCalls) {
    // console.log(functionCall);
    const response = (nfs as any)[functionCall.name](functionCall.args);
    apiResponse.push({
      name: functionCall.name,
      response: response,
    });
  }

  const naturalLanguageSummary = await chat.sendMessage(
    apiResponse.map(
      ({ name, response }): FunctionResponsePart => ({
        functionResponse: {
          name,
          response: {
            content: response,
          },
        },
      })
    )
  );

  console.log("Summary", naturalLanguageSummary.response.text());
})();
