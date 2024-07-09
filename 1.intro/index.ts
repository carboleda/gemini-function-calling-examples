import readline from "node:readline/promises";
import {
  FunctionDeclaration,
  FunctionDeclarationSchemaType,
  GoogleGenerativeAI,
} from "@google/generative-ai";

interface Tools {
  functionDeclarations: FunctionDeclaration[];
}

export const genAI = new GoogleGenerativeAI(process.env.API_KEY || "");

async function handlePrompt(
  userInput: string = "What is the time in Cali, Colombia?"
) {
  function getCurrentTime({ timeZone }: { timeZone: string }): string {
    const now = new Date();
    const date = now.toLocaleDateString("en-US", { timeZone });
    const time = now.toLocaleTimeString("en-US", { timeZone });
    return `${date} ${time}`;
  }

  const functions: { [name: string]: Function } = {
    getCurrentTime,
  };

  const tools: Tools[] = [
    {
      functionDeclarations: [
        {
          name: "getCurrentTime",
          description: `Get the current time in a specific location`,
          parameters: {
            type: FunctionDeclarationSchemaType.OBJECT,
            properties: {
              timeZone: {
                type: FunctionDeclarationSchemaType.STRING,
                description:
                  "Timezone in IANA format. Example America/Bogotá, Europe/Berlin",
              },
            },
            required: ["timeZone"],
          },
        },
      ],
    },
  ];

  const model = genAI.getGenerativeModel(
    { model: process.env.GEMINI_MODEL!!, tools },
    { apiVersion: "v1beta" }
  );

  // >>>> First turn
  const promptTurn1 = {
    role: "user",
    parts: [
      {
        text: userInput,
      },
    ],
  };

  const resultTurn1 = await model.generateContent({
    contents: [promptTurn1],
  });
  const responseTurn1 = resultTurn1.response;
  //   console.dir(response, { depth: null });

  if (responseTurn1?.candidates?.length === 0) {
    throw new Error("No candidates");
  }

  const content = resultTurn1?.response?.candidates?.[0]?.content;
  if (content?.parts.length === 0) {
    throw new Error("No parts");
  }
  // <<<< First turn

  // >>>> Second turn
  const functionCall = content?.parts[0].functionCall;

  if (functionCall) {
    console.log("functionCall", functionCall);
    const { name, args } = functionCall;
    const functionRef = functions[name];

    if (!functionRef) {
      throw new Error(`Unknown function "${name}"`);
    }

    const functionResponse = {
      role: "function",
      parts: [
        {
          functionResponse: {
            name,
            response: {
              content: functionRef(args),
            },
          },
        },
      ],
    };
    const promptTurn2 = {
      contents: [promptTurn1, content, functionResponse],
    };
    const responseTurn2 = await model.generateContent(promptTurn2);
    console.log(responseTurn2.response.text());
    // <<<< Second turn
    return;
  }

  const text = content?.parts.map(({ text }) => text).join("");
  if (text) {
    console.log(text);
  }
}

(async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  while (true) {
    const input = await rl.question(
      'Enter "exit" or "q" to quit.\n' +
        'Enter a location in format "City, Country": '
    );

    if (input === "exit" || input === "q") {
      rl.close();
      break;
    }

    await handlePrompt(input);
  }
})();
